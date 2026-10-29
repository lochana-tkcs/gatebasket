// Runs the migration + seed on an in-memory Postgres (PGlite) with small stand-ins for
// Supabase's auth/storage schemas, then checks RLS and the order RPCs.
// Usage: npm run test:db
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const SUPABASE_SHIM = `
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;

  create schema auth;
  grant usage on schema auth to anon, authenticated;
  create table auth.users (id uuid primary key, phone text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select string_to_array(name, '/') $$;

  create publication supabase_realtime;
`;

const STORE = '00000000-0000-0000-0000-0000000000a1';
const R1 = '10000000-0000-0000-0000-000000000001'; // resident, Green Meadows
const R2 = '10000000-0000-0000-0000-000000000002'; // resident, another society
const OWNER = '10000000-0000-0000-0000-000000000003';

const db = new PGlite();

// Run sql as a signed-in user (role authenticated + auth.uid()).
async function as(uid, sql, params) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec(`reset role;`);
  }
}

async function productId(name) {
  return (await db.query(`select id from products where name = $1`, [name])).rows[0].id;
}

test('setup: migration and seed apply', async () => {
  await db.exec(SUPABASE_SHIM);
  await db.exec(read('../migrations/0001_init.sql'));
  await db.exec(read('../seed.sql'));

  await db.exec(`
    insert into societies (id, name, join_code) values ('00000000-0000-0000-0000-000000000002', 'Other Towers', 'OTHER1');
    insert into flats (society_id, block, number) values ('00000000-0000-0000-0000-000000000002', 'X', '1');
    insert into auth.users (id, phone) values
      ('${R1}', '919000000001'), ('${R2}', '919000000002'), ('${OWNER}', '919000000003');
  `);
  await db.query(`select assign_store_owner('+919000000003', $1)`, [STORE]);

  const flatA = (await db.query(`select id from flats where block = 'A' and number = '101'`)).rows[0].id;
  await as(R1, `select join_society('green1', $1, 'Asha')`, [flatA]);
  const flatX = (await db.query(`select id from flats where block = 'X'`)).rows[0].id;
  await as(R2, `select join_society('OTHER1', $1, 'Ravi')`, [flatX]);
});

test('join_society rejects a flat from another society', async () => {
  const flatX = (await db.query(`select id from flats where block = 'X'`)).rows[0].id;
  await assert.rejects(as(R1, `select join_society('GREEN1', $1, 'Asha')`, [flatX]), /Flat does not belong/);
});

test('residents only see their own society catalog', async () => {
  assert.equal((await as(R1, `select count(*)::int n from products`)).rows[0].n, 30);
  assert.equal((await as(R2, `select count(*)::int n from products`)).rows[0].n, 0);
  assert.equal((await as(R2, `select count(*)::int n from stores`)).rows[0].n, 0);
});

test('residents cannot change their own role', async () => {
  await assert.rejects(as(R1, `update profiles set role = 'admin' where id = $1`, [R1]), /permission denied/);
});

test('place_order snapshots prices, totals, and decrements tracked stock', async () => {
  const paneer = await productId('Paneer');
  const milk = await productId('Toned Milk');
  const items = JSON.stringify([{ product_id: paneer, qty: 2 }, { product_id: milk, qty: 1 }]);
  const orderId = (await as(R1, `select place_order($1::jsonb, 'cash', 'ring bell') id`, [items])).rows[0].id;

  const order = (await as(R1, `select subtotal, total, status from orders where id = $1`, [orderId])).rows[0];
  assert.equal(Number(order.subtotal), 2 * 90 + 27);
  assert.equal(Number(order.total), 207);
  assert.equal(order.status, 'placed');
  assert.equal((await db.query(`select stock_qty from products where id = $1`, [paneer])).rows[0].stock_qty, 10);

  // Other residents can't see it; the store owner can.
  assert.equal((await as(R2, `select count(*)::int n from orders`)).rows[0].n, 0);
  assert.equal((await as(OWNER, `select count(*)::int n from orders where id = $1`, [orderId])).rows[0].n, 1);
  assert.equal((await as(OWNER, `select name from profiles where id = $1`, [R1])).rows[0].name, 'Asha');
});

test('place_order rejects out-of-stock items, over-stock quantities and small orders', async () => {
  const chips = await productId('Potato Chips');
  await db.query(`update products set in_stock = false where id = $1`, [chips]);
  await assert.rejects(
    as(R1, `select place_order($1::jsonb, 'upi')`, [JSON.stringify([{ product_id: chips, qty: 5 }])]),
    /out of stock/,
  );
  await db.query(`update products set in_stock = true where id = $1`, [chips]);

  const paneer = await productId('Paneer');
  await assert.rejects(
    as(R1, `select place_order($1::jsonb, 'upi')`, [JSON.stringify([{ product_id: paneer, qty: 99 }])]),
    /Only 10 left/,
  );

  const salt = await productId('Salt');
  await assert.rejects(
    as(R1, `select place_order($1::jsonb, 'upi')`, [JSON.stringify([{ product_id: salt, qty: 1 }])]),
    /Minimum order/,
  );
  // A failed order leaves nothing behind.
  assert.equal((await db.query(`select count(*)::int n from orders`)).rows[0].n, 1);
});

test('place_order rejects when the store is closed', async () => {
  await as(OWNER, `update stores set is_open = false where id = $1`, [STORE]);
  const rice = await productId('Basmati Rice');
  await assert.rejects(
    as(R1, `select place_order($1::jsonb, 'cash')`, [JSON.stringify([{ product_id: rice, qty: 1 }])]),
    /closed/,
  );
  await as(OWNER, `update stores set is_open = true where id = $1`, [STORE]);
});

test('residents cannot edit products or the store', async () => {
  const rice = await productId('Basmati Rice');
  const res = await as(R1, `update products set price = 1 where id = $1 returning id`, [rice]);
  assert.equal(res.rows.length, 0);
  const store = await as(R1, `update stores set is_open = false where id = $1 returning id`, [STORE]);
  assert.equal(store.rows.length, 0);
});

test('only the store owner moves orders through valid statuses', async () => {
  const orderId = (await db.query(`select id from orders limit 1`)).rows[0].id;

  await assert.rejects(as(R1, `select update_order_status($1, 'accepted')`, [orderId]), /Order not found/);
  await assert.rejects(as(OWNER, `select update_order_status($1, 'delivered')`, [orderId]), /Cannot move/);

  for (const s of ['accepted', 'packed', 'out_for_delivery', 'delivered']) {
    await as(OWNER, `select update_order_status($1, $2)`, [orderId, s]);
  }
  await as(OWNER, `select set_order_paid($1, true)`, [orderId]);
  const o = (await db.query(`select status, paid, delivered_at from orders where id = $1`, [orderId])).rows[0];
  assert.equal(o.status, 'delivered');
  assert.equal(o.paid, true);
  assert.ok(o.delivered_at);
});

test('cancelling restocks, and accepted orders cannot be cancelled', async () => {
  const paneer = await productId('Paneer');
  const items = JSON.stringify([{ product_id: paneer, qty: 3 }]);
  const a = (await as(R1, `select place_order($1::jsonb, 'cash') id`, [items])).rows[0].id;
  assert.equal((await db.query(`select stock_qty from products where id = $1`, [paneer])).rows[0].stock_qty, 7);
  await as(R1, `select cancel_order($1)`, [a]);
  assert.equal((await db.query(`select stock_qty from products where id = $1`, [paneer])).rows[0].stock_qty, 10);

  const b = (await as(R1, `select place_order($1::jsonb, 'cash') id`, [items])).rows[0].id;
  await as(OWNER, `select update_order_status($1, 'accepted')`, [b]);
  await assert.rejects(as(R1, `select cancel_order($1)`, [b]), /already accepted/);
});

test('admin-only functions are not callable by users', async () => {
  await assert.rejects(as(R1, `select assign_store_owner('+919000000001', $1)`, [STORE]), /permission denied/);
});
