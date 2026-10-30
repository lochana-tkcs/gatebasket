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
- `place_order` runs as one transaction. It checks that the store is open, checks stock, saves the prices at order time, decrements tracked stock and enforces the minimum order
- Order status changes go through `update_order_status`, which only allows valid transitions. Cancelled and rejected orders are restocked
- Realtime order updates, and push notifications through an edge function

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
```

## Setup

### 1. Requirements
- Node **22+** (`nvm use` reads `.nvmrc`)
- A free [Supabase](https://supabase.com) project

### 2. Database
In the Supabase dashboard **SQL Editor**, run `supabase/migrations/0001_init.sql` and then `supabase/seed.sql`.

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
- Online UPI payments (Razorpay) and platform commission
- More than one store per society
- Visitor pre-approval and guard app
- Bulk catalog import from a CSV file or barcodes
