// Sends Expo push notifications when an order is created or changes status.
// Triggered by a Supabase Database Webhook on public.orders (INSERT, UPDATE).
// The webhook must send header `x-webhook-secret: <WEBHOOK_SECRET>`.
import { createClient } from 'npm:@supabase/supabase-js@2';

type OrderRow = {
  id: string;
  order_no: number;
  store_id: string;
  resident_id: string;
  flat_id: string;
  status: string;
  total: number;
  cancel_reason: string | null;
};

type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  record: OrderRow | null;
  old_record: OrderRow | null;
};

const RESIDENT_MESSAGES: Record<string, string> = {
  accepted: 'The store accepted your order and is getting it ready.',
  packed: 'Your order is packed.',
  out_for_delivery: 'Your order is on its way to your door.',
  delivered: 'Your order was delivered. Enjoy!',
  rejected: 'Sorry, the store could not take your order.',
};

const TIMEOUT_MESSAGE = "The store didn't respond in time, so your order was cancelled. Nothing was charged.";

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function sendPush(token: string | null | undefined, title: string, body: string, orderId: string) {
  if (!token) return;
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      to: token,
      title,
      body,
      sound: 'default',
      priority: 'high',
      channelId: 'orders',
      data: { orderId },
    }),
  });
  if (!res.ok) console.error('Expo push failed', res.status, await res.text());
}

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = (await req.json()) as WebhookPayload;
  const order = payload.record;
  if (!order) return new Response('ignored');

  if (payload.type === 'INSERT') {
    const { data: store } = await supabase
      .from('stores')
      .select('owner:profiles!stores_owner_id_fkey(expo_push_token)')
      .eq('id', order.store_id)
      .single();
    const { data: flat } = await supabase.from('flats').select('block, number').eq('id', order.flat_id).single();
    const owner = store?.owner as unknown as { expo_push_token: string | null } | null;
    await sendPush(
      owner?.expo_push_token,
      `New order #${order.order_no} · ₹${order.total}`,
      flat ? `Deliver to Block ${flat.block} · ${flat.number}` : 'Tap to view the order',
      order.id,
    );
  } else if (payload.type === 'UPDATE' && payload.old_record?.status !== order.status) {
    const message =
      order.status === 'cancelled' && order.cancel_reason === 'store_timeout' ? TIMEOUT_MESSAGE : RESIDENT_MESSAGES[order.status];
    if (message) {
      const { data: resident } = await supabase
        .from('profiles')
        .select('expo_push_token')
        .eq('id', order.resident_id)
        .single();
      await sendPush(resident?.expo_push_token, `Order #${order.order_no}`, message, order.id);
    }
  }

  return new Response('ok');
});
