# GateBasket

Order from your gated community's own general store and get it delivered to your door in minutes.

Most gated communities have a store inside, but walking there takes time, so residents order from quick-commerce apps instead. GateBasket puts the community store in a MyGate-style app. Residents order from their phone, and the store's helper, who is already inside the gate, delivers to the flat.

Built with **Expo (React Native)** and **Supabase**.

## Features

**Residents**
- Phone OTP login, and joining a society with a code and choosing block and flat
- MyGate-style design: gradient header with Activity · Store · Apartment tabs, activity-feed order cards, colourful icon tiles and the Ubuntu font
- Browse the store by category, search, and add to cart with quantity steppers (out-of-stock items are greyed out)
- Checkout with a delivery note and cash/UPI on delivery
- Live order tracking (placed → accepted → packed → out for delivery → delivered), cancelling before the store accepts, and reordering

**Store owner**
- Live order queue with a loud alert sound and vibration on each new order
- One-tap actions: accept, packed, out for delivery, delivered, reject, mark paid
- Today's orders and sales
- Catalog: add or edit products with photos, and toggle in/out of stock with one tap
- Store settings: open/closed, hours, minimum order and delivery fee

**Backend**
- Postgres row-level security: residents only see their own society's store and their own orders, and owners only see their own store
- Realtime order and stock updates, and push notifications through an edge function

## Design decisions

Orders and stock are kept consistent even when two people want the last packet. The full write-up, with examples, is in [`docs/design-decisions.md`](docs/design-decisions.md). In short:

- **One source of truth:** stock and orders live only in Postgres. The cart is on the phone and reserves nothing. Offline, ordering fails instead of queueing (consistency over availability).
- **Server-only writes:** the app can't edit orders directly. Every change goes through a database function (`place_order`, `cancel_order`, `update_order_status`, …).
- **One transaction per order:** stock check, stock decrement, order and items are saved together or not at all.
- **Row locks:** `place_order` locks each product row while checking it, so two checkouts for the last unit are served one at a time. Locks are taken in product-id order to avoid deadlocks, and last only milliseconds.
- **Server-side prices:** the app sends product ids and quantities; the server computes totals and snapshots each item's price.
- **Availability rule:** `in_stock` is the owner's switch; a product is orderable when it's on and has stock left (or isn't counted).
- **Status state machine:** only valid transitions are allowed, and the order row is locked so Cancel and Accept can't both win.
- **Expiring reservation:** orders the store doesn't accept within 15 minutes are cancelled and restocked by `expire_stale_orders` (`pg_cron`, every minute).
- **Restock exactly once:** cancel, reject and timeout add stock back in the same transaction, without overriding a manual out-of-stock.
- **Idempotent checkout:** each checkout sends a unique id, so a retry after a lost reply returns the same order instead of a duplicate.
- **Live but verified:** Realtime events trigger a re-fetch, and checkout always re-checks live stock under the lock.

## Project layout

```
src/app/            Expo Router screens
  (resident)/       Activity · Store · Apartment tabs (profile via the gear icon)
  (store)/          Orders · Catalog · Settings tabs (store owner)
  cart.tsx, order/[id].tsx, product-edit.tsx, login.tsx, onboarding.tsx
src/components/     Shared UI
src/lib/            Supabase client, auth, cart, queries, theme (brand colours live in theme.ts)
supabase/
  migrations/       Schema, RLS and RPCs
  seed.sql          Demo society (code GREEN1), flats, store and 30 products with photos
  seed-images/      Demo product photos from Wikimedia Commons (see CREDITS.md)
  functions/        notify-order push notification edge function
  tests/            Database tests (run on PGlite, no Docker needed)
docs/
  design-decisions.md   How orders and stock stay consistent
```

## Setup

### 1. Requirements
- Node **22+** (`nvm use` reads `.nvmrc`)
- A free [Supabase](https://supabase.com) project

### 2. Database
In the Supabase dashboard **SQL Editor**, run each file in `supabase/migrations/` in order (`0001_init.sql`, then `0002_order_safety.sql`), and then `supabase/seed.sql`.

Or, with the CLI:
```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
psql "<your-db-connection-string>" -f supabase/seed.sql
```

### 3. Phone login
Go to **Authentication → Providers → Phone**, turn it on, and connect an SMS provider (Twilio, MessageBird, Vonage or Textlocal).
For development, skip SMS by adding **test phone numbers** with fixed OTPs on the same page, for example `919000000001 → 123456`.

### 4. App
```bash
npm install
cp .env.example .env   # fill in your project URL and anon key
npx expo start
```
Open it in Expo Go, or in a development build for push notifications (see below).

### 5. Make a store owner
Sign in once in the app with the store owner's phone number, then run this in the SQL editor:
```sql
select assign_store_owner('+919000000002', '00000000-0000-0000-0000-0000000000a1');
```
Restart the app. That user now sees the store dashboard.

### 6. Push notifications (optional)
1. `npx eas-cli@latest init` adds an EAS project id. Push needs a [development build](https://docs.expo.dev/develop/development-builds/introduction/), because Expo Go on Android doesn't support push.
2. Deploy the function and set a secret:
   ```bash
   npx supabase functions deploy notify-order --no-verify-jwt
   npx supabase secrets set WEBHOOK_SECRET=<random-string>
   ```
3. In **Database → Webhooks**, create a webhook on table `orders` for events **Insert** and **Update**. Point it at the `notify-order` Supabase Edge Function, with the HTTP header `x-webhook-secret: <random-string>`.

The store owner gets a push for each new order, and the resident gets a push at each status change.

## Tests

```bash
npm run test:db     # migration + seed + RLS and order RPC tests on in-memory Postgres
npx tsc --noEmit
npx expo lint
```

## Roadmap
- "Not delivered" step for the store that closes the order and restocks it
- Offer "remove unavailable items and place the rest" at checkout
- Back-in-stock notifications
- Online UPI payments (Razorpay) with an expiring "awaiting payment" reservation, and platform commission
- More than one store per society
- Visitor pre-approval and guard app
- Bulk catalog import from a CSV file or barcodes
