# Design decisions: keeping orders and stock consistent

GateBasket sells from one small store with real, limited stock, often down to the last packet. These are the decisions that keep orders and stock correct, and the gaps that remain.

The running example: **Paneer has 1 packet left. Asha (A) and Ravi (B) both want it.**

## 1. One source of truth, consistency over availability

- All stock and orders live in **one Postgres database** (Supabase). Phones never keep their own copy of stock or decide whether an order succeeded.
- **The cart lives only on the phone and reserves nothing.** Stock changes only when an order is placed, so abandoned carts never hold stock.
- When the network is down, **ordering fails instead of queueing offline**. In CAP terms we chose consistency over availability: a clear "no" is better than overselling. The cart is saved on the phone, so the resident can simply retry.
- Live updates are the one place we accept **eventual consistency**. A missed update only delays the screen; pull-to-refresh and the checkout re-check always read the database.

## 2. All writes go through server functions

The app can read orders but cannot insert or edit them directly: row-level security has no insert or update policies on `orders`. Every change goes through a database function:

| Function | Caller | Purpose |
|---|---|---|
| `place_order` | Resident | Create an order and reserve stock |
| `cancel_order` | Resident | Cancel while still *placed*; restock |
| `update_order_status` | Store owner | Move an order forward or reject it (restock) |
| `set_order_paid` | Store owner | Mark cash/UPI as received |
| `expire_stale_orders` | `pg_cron` (every minute) | Auto-cancel orders not accepted in 15 minutes; restock |
| `restock_order` | Internal only | Add an order's quantities back to stock |

The rules live in one place on the server, so a modified app can't skip them.

## 3. Placing an order is one transaction

`place_order` checks the resident and store, locks and checks each product, reduces stock, saves the order and items, computes the total and checks the minimum order, all in **one transaction**. If any step fails (store closed, out of stock, below the minimum), **everything is undone**: no half-orders and no lost stock.

## 4. Row locks prevent overselling

Without a lock, two checkouts can both read "1 left", both pass the check, and both succeed: two orders for one packet (a check-then-act race).

`place_order` locks each product row (`select … for update`) before checking and reducing its stock:

| Time | A's checkout | B's checkout | Stock |
|---|---|---|---|
| 1 | Locks and reads 1 | | 1 |
| 2 | | Tries to lock and waits | 1 |
| 3 | Sets stock to 0, saves, releases the lock | | 0 |
| 4 | | Locks and reads 0, fails "Paneer is out of stock" | 0 |

- **The lock exists only while "Place order" is being processed** (milliseconds). It is never held while someone browses or after the order is saved. It's released automatically when the transaction ends, and Supabase's request timeout (8 s for logged-in users) bounds even a pathological case.
- **Locks are taken in product-id order**, so two carts sharing items queue instead of deadlocking.
- **Defence in depth:** `stock_qty >= 0` is a database constraint, so stock can never go negative even if the lock were removed by mistake.

**B's experience:** the button spins for a moment, then shows "Could not place order — Paneer is out of stock". B's whole order is undone, the catalog refreshes with Paneer greyed out, and the cart is untouched so B can remove Paneer and order the rest.

## 5. The server decides prices and totals

- The app sends only **product ids and quantities**. The server looks up prices and computes the subtotal, delivery fee and total, so a modified app can't set its own price.
- Duplicate cart lines are merged on the server before the stock check.
- Each order item stores the **name and price at order time**, so later price edits never change past orders.

## 6. Clear availability rule

- `in_stock` is **only the owner's switch**. `stock_qty` is an optional count (`null` = not counted).
- A product is orderable when **`in_stock` and (`stock_qty` is null or `stock_qty > 0`)**. The database and the app (`isAvailable` in `src/lib/types.ts`) use the same rule.
- The owner's catalog shows **Off** (switched off) or **Sold out** (count reached 0).

## 7. Order status is a state machine

```
placed → accepted → packed → out_for_delivery → delivered
   │         │
   ├→ rejected (store)        placed → cancelled (resident, or 15-minute timeout)
   └→ cancelled
```

- Any other transition is refused ("Cannot move order from placed to delivered").
- Status changes **lock the order row**, so a resident's Cancel and the store's Accept at the same moment can't both happen: one wins, the other gets an error.

## 8. A reservation that expires until the store accepts

Once placed, the order itself holds the stock (it's already been reduced). That reservation:

- **expires after 15 minutes while the order is *placed***. `expire_stale_orders` runs every minute via `pg_cron`, cancels such orders with `cancel_reason = 'store_timeout'`, restocks them, and the resident gets a push. Real expiry is 15–16 minutes; a missed run is caught by the next one. It uses `for update skip locked`, so it never fights a store that is accepting the same order.
- **has no expiry once the store accepts**, because the store has committed to delivering.

So: a **short transaction lock** (no timer) plus a **stock reservation with a timeout** until acceptance.

## 9. Stock comes back exactly once

- Cancelled, rejected and auto-cancelled orders call `restock_order`, which adds the order's quantities back. It runs **in the same transaction** as the status change, so an order can't be cancelled while its stock stays reserved.
- An order can only be closed once, so stock is never added back twice.
- Restocking **never turns the owner's switch back on**: a manual "out of stock" (e.g. the packet went bad) stays.

## 10. Idempotent checkout: retries never duplicate

The phone can't tell "the order failed" from "the order worked but the reply got lost", so retries must be safe.

- The cart screen creates a random **checkout id** once (`Crypto.randomUUID()` in `src/app/cart.tsx`) and sends the same id with every attempt (`p_client_id`).
- `orders.client_order_id` is **unique per resident**. `place_order` returns the existing order if that id was already used.
- If two retries arrive at the same instant, the unique constraint lets only one insert; the other catches the conflict and returns the first order.
- A failed attempt saves nothing, so the same id can be retried normally. A new checkout gets a new id.

## 11. Screens catch up with the database

- `orders` and `products` are published to Supabase Realtime. Live events only **trigger a re-fetch** (React Query invalidation); the screen never trusts the event payload itself.
- The catalog (`useCatalog` in `src/lib/queries.ts`) also re-fetches on pull-to-refresh, after placing an order (success or failure), after owner edits, and when the cached copy is older than 30 seconds.
- The cart keeps a copy of each product as it was when added. Its stock may be stale, which is acceptable because `place_order` re-checks live stock under the lock.

## Tests

`npm run test:db` runs the migrations and seed on in-memory Postgres (PGlite) and covers: society isolation, role protection, price snapshots and totals, out-of-stock / over-stock / minimum-order rejection, closed store, the status state machine, cancel and restock, idempotent retries, selling the last unit, the manual out-of-stock switch, the 15-minute auto-cancel, and Realtime publication.

The lock-ordering (deadlock) fix has **no automated test**: PGlite runs one connection at a time, so it can't simulate two simultaneous checkouts.

## Known gaps

- **Failed delivery:** there's no "not delivered / returned" step. If a resident refuses the order at the door, the store can't close it with a restock once it's packed or on the way.
- **Uncounted items** (`stock_qty` null) can still be oversold when the shelf runs out; the store then rejects the order.
- **One unavailable item fails the whole order.** The app could offer "remove it and place the rest".
- **No back-in-stock alert:** B only sees Paneer return if B is on the store screen.
- **Payment is outside the system** (cash/UPI on delivery); `paid` is whatever the owner marks. Online payment would add an "awaiting payment" status that holds stock for a short window and releases it through the same auto-cancel job.
- **Region:** the demo database is in Ireland (~150 ms extra per request from India); production should use Mumbai.
