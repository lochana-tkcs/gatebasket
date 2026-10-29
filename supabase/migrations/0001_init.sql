-- GateBasket: community store ordering
-- Tables, row-level security, and the RPCs the app calls.

-- ───────────────────────── Tables ─────────────────────────

create table public.societies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.flats (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  block text not null,
  number text not null,
  unique (society_id, block, number)
);

create type public.user_role as enum ('resident', 'store_owner', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text,
  name text,
  role public.user_role not null default 'resident',
  society_id uuid references public.societies (id),
  flat_id uuid references public.flats (id),
  expo_push_token text,
  created_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null unique references public.societies (id) on delete cascade,
  owner_id uuid references public.profiles (id),
  name text not null,
  is_open boolean not null default true,
  opening_hours text not null default '7:00 AM – 10:00 PM',
  min_order numeric(10, 2) not null default 0,
  delivery_fee numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  sort int not null default 0
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  mrp numeric(10, 2),
  unit text,
  image_url text,
  in_stock boolean not null default true,
  stock_qty int check (stock_qty is null or stock_qty >= 0),
  created_at timestamptz not null default now()
);

create type public.order_status as enum (
  'placed', 'accepted', 'packed', 'out_for_delivery', 'delivered', 'cancelled', 'rejected'
);
create type public.payment_mode as enum ('cash', 'upi');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no bigint generated always as identity,
  store_id uuid not null references public.stores (id),
  resident_id uuid not null references public.profiles (id),
  flat_id uuid not null references public.flats (id),
  status public.order_status not null default 'placed',
  subtotal numeric(10, 2) not null,
  delivery_fee numeric(10, 2) not null,
  total numeric(10, 2) not null,
  payment_mode public.payment_mode not null,
  paid boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  packed_at timestamptz,
  out_for_delivery_at timestamptz,
  delivered_at timestamptz,
  closed_at timestamptz -- cancelled or rejected
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name_snapshot text not null,
  price_snapshot numeric(10, 2) not null,
  qty int not null check (qty > 0)
);

create index on public.flats (society_id);
create index on public.products (store_id);
create index on public.orders (store_id, created_at desc);
create index on public.orders (resident_id, created_at desc);
create index on public.order_items (order_id);

-- ───────────────────────── Helpers ─────────────────────────
-- security definer so policies can look up the caller without recursing into RLS.

create function public.my_society_id() returns uuid
language sql stable security definer set search_path = public as $$
  select society_id from profiles where id = auth.uid()
$$;

create function public.my_store_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from stores where owner_id = auth.uid()
$$;

-- Every new auth user gets a resident profile.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, phone) values (new.id, new.phone);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Row-level security ─────────────────────────

alter table public.societies enable row level security;
alter table public.flats enable row level security;
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "members read their society" on public.societies
  for select to authenticated using (id = public.my_society_id());

create policy "members read their society's flats" on public.flats
  for select to authenticated using (society_id = public.my_society_id());

create policy "read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "store owner reads customers" on public.profiles
  for select to authenticated using (
    exists (select 1 from public.orders o where o.resident_id = profiles.id and o.store_id = public.my_store_id())
  );
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- Only these columns are user-editable; role and society change through RPCs.
revoke update on public.profiles from authenticated;
grant update (name, expo_push_token) on public.profiles to authenticated;

create policy "members read their store" on public.stores
  for select to authenticated using (society_id = public.my_society_id() or owner_id = auth.uid());
create policy "owner updates store" on public.stores
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
revoke update on public.stores from authenticated;
grant update (name, is_open, opening_hours, min_order, delivery_fee) on public.stores to authenticated;

create policy "members read categories" on public.categories
  for select to authenticated using (
    store_id in (select id from public.stores where society_id = public.my_society_id())
    or store_id = public.my_store_id()
  );
create policy "owner manages categories" on public.categories
  for all to authenticated using (store_id = public.my_store_id()) with check (store_id = public.my_store_id());

create policy "members read products" on public.products
  for select to authenticated using (
    store_id in (select id from public.stores where society_id = public.my_society_id())
    or store_id = public.my_store_id()
  );
create policy "owner manages products" on public.products
  for all to authenticated using (store_id = public.my_store_id()) with check (store_id = public.my_store_id());

-- Orders are written only through the RPCs below, so there are no insert/update policies.
create policy "resident or store reads orders" on public.orders
  for select to authenticated using (resident_id = auth.uid() or store_id = public.my_store_id());

create policy "resident or store reads order items" on public.order_items
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.resident_id = auth.uid() or o.store_id = public.my_store_id())
    )
  );

-- ───────────────────────── RPCs ─────────────────────────

-- Onboarding step 1: look up a society and its flats by join code (caller has no society yet).
create function public.society_by_code(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'address', s.address,
    'flats', coalesce((
      select jsonb_agg(jsonb_build_object('id', f.id, 'block', f.block, 'number', f.number) order by f.block, f.number)
      from flats f where f.society_id = s.id
    ), '[]'::jsonb)
  )
  from societies s
  where upper(s.join_code) = upper(trim(p_code))
$$;

-- Onboarding step 2: join the society as a resident of a flat.
create function public.join_society(p_code text, p_flat_id uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_society uuid;
begin
  select id into v_society from societies where upper(join_code) = upper(trim(p_code));
  if v_society is null then
    raise exception 'Invalid society code';
  end if;
  if not exists (select 1 from flats where id = p_flat_id and society_id = v_society) then
    raise exception 'Flat does not belong to this society';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Name is required';
  end if;

  update profiles
     set society_id = v_society, flat_id = p_flat_id, name = trim(p_name)
   where id = auth.uid();
end;
$$;

-- Place an order atomically. p_items: [{"product_id": uuid, "qty": int}, ...]
create function public.place_order(p_items jsonb, p_payment_mode public.payment_mode, p_note text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_profile profiles%rowtype;
  v_store stores%rowtype;
  v_order uuid;
  v_subtotal numeric(10, 2) := 0;
  v_item record;
  v_product products%rowtype;
begin
  select * into v_profile from profiles where id = auth.uid();
  if v_profile.id is null or v_profile.society_id is null or v_profile.flat_id is null then
    raise exception 'Join your society before ordering';
  end if;

  select * into v_store from stores where society_id = v_profile.society_id;
  if v_store.id is null then
    raise exception 'Your society has no store yet';
  end if;
  if not v_store.is_open then
    raise exception 'The store is closed right now';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty';
  end if;

  insert into orders (store_id, resident_id, flat_id, subtotal, delivery_fee, total, payment_mode, note)
  values (v_store.id, v_profile.id, v_profile.flat_id, 0, v_store.delivery_fee, 0, p_payment_mode, nullif(trim(p_note), ''))
  returning id into v_order;

  for v_item in
    select (e ->> 'product_id')::uuid as product_id, sum((e ->> 'qty')::int)::int as qty
    from jsonb_array_elements(p_items) e
    group by 1
  loop
    if v_item.qty <= 0 then
      raise exception 'Invalid quantity';
    end if;

    -- Lock the row so two orders can't oversell the same stock.
    select * into v_product from products where id = v_item.product_id and store_id = v_store.id for update;
    if v_product.id is null then
      raise exception 'A product in your cart is no longer available';
    end if;
    if not v_product.in_stock then
      raise exception '% is out of stock', v_product.name;
    end if;
    if v_product.stock_qty is not null then
      if v_product.stock_qty < v_item.qty then
        raise exception 'Only % left of %', v_product.stock_qty, v_product.name;
      end if;
      update products
         set stock_qty = stock_qty - v_item.qty,
             in_stock = (stock_qty - v_item.qty) > 0
       where id = v_product.id;
    end if;

    insert into order_items (order_id, product_id, name_snapshot, price_snapshot, qty)
    values (v_order, v_product.id, v_product.name, v_product.price, v_item.qty);
    v_subtotal := v_subtotal + v_product.price * v_item.qty;
  end loop;

  if v_subtotal < v_store.min_order then
    raise exception 'Minimum order is ₹%', v_store.min_order;
  end if;

  update orders
     set subtotal = v_subtotal, total = v_subtotal + v_store.delivery_fee
   where id = v_order;

  return v_order;
end;
$$;

-- Put tracked stock back when an order is cancelled or rejected.
create function public.restock_order(p_order uuid) returns void
language sql security definer set search_path = public as $$
  update products p
     set stock_qty = p.stock_qty + oi.qty, in_stock = true
    from order_items oi
   where oi.order_id = p_order and oi.product_id = p.id and p.stock_qty is not null
$$;
revoke execute on function public.restock_order(uuid) from public, anon, authenticated;

-- Store owner moves an order forward. Only valid transitions are allowed.
create function public.update_order_status(p_order uuid, p_status public.order_status) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order orders%rowtype;
begin
  select * into v_order from orders where id = p_order for update;
  if v_order.id is null or v_order.store_id is distinct from my_store_id() then
    raise exception 'Order not found';
  end if;

  if not (
    (v_order.status = 'placed' and p_status in ('accepted', 'rejected')) or
    (v_order.status = 'accepted' and p_status in ('packed', 'rejected')) or
    (v_order.status = 'packed' and p_status = 'out_for_delivery') or
    (v_order.status = 'out_for_delivery' and p_status = 'delivered')
  ) then
    raise exception 'Cannot move order from % to %', v_order.status, p_status;
  end if;

  update orders set
    status = p_status,
    accepted_at = case when p_status = 'accepted' then now() else accepted_at end,
    packed_at = case when p_status = 'packed' then now() else packed_at end,
    out_for_delivery_at = case when p_status = 'out_for_delivery' then now() else out_for_delivery_at end,
    delivered_at = case when p_status = 'delivered' then now() else delivered_at end,
    closed_at = case when p_status = 'rejected' then now() else closed_at end
  where id = p_order;

  if p_status = 'rejected' then
    perform restock_order(p_order);
  end if;
end;
$$;

-- Resident cancels an order the store hasn't accepted yet.
create function public.cancel_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order orders%rowtype;
begin
  select * into v_order from orders where id = p_order for update;
  if v_order.id is null or v_order.resident_id <> auth.uid() then
    raise exception 'Order not found';
  end if;
  if v_order.status <> 'placed' then
    raise exception 'The store has already accepted this order';
  end if;

  update orders set status = 'cancelled', closed_at = now() where id = p_order;
  perform restock_order(p_order);
end;
$$;

create function public.set_order_paid(p_order uuid, p_paid boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update orders set paid = p_paid where id = p_order and store_id = my_store_id();
  if not found then
    raise exception 'Order not found';
  end if;
end;
$$;

-- Admin-only (run from the SQL editor): make the user with this phone the store's owner.
create function public.assign_store_owner(p_phone text, p_store uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid;
  v_society uuid;
begin
  select id into v_profile from profiles where phone = ltrim(p_phone, '+');
  if v_profile is null then
    raise exception 'No user with phone % has signed in yet', p_phone;
  end if;
  select society_id into v_society from stores where id = p_store;

  update stores set owner_id = v_profile where id = p_store;
  update profiles set role = 'store_owner', society_id = v_society where id = v_profile;
end;
$$;
revoke execute on function public.assign_store_owner(text, uuid) from public, anon, authenticated;

-- ───────────────────────── Realtime ─────────────────────────
-- Realtime applies the select policies above, so each client only receives its own rows.
alter publication supabase_realtime add table public.orders;

-- ───────────────────────── Storage ─────────────────────────
-- Product photos live at product-images/<store_id>/<file>.
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true);

create policy "anyone reads product images" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "owner uploads product images" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'product-images' and (storage.foldername(name))[1] = public.my_store_id()::text
  );
create policy "owner replaces product images" on storage.objects
  for update to authenticated using (
    bucket_id = 'product-images' and (storage.foldername(name))[1] = public.my_store_id()::text
  );
