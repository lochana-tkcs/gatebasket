import type { Flat, OrderStatus } from './types';

export function rupees(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return `₹${Number.isInteger(v) ? v : v.toFixed(2)}`;
}

export function flatLabel(flat: Pick<Flat, 'block' | 'number'> | null | undefined): string {
  return flat ? `Block ${flat.block} · ${flat.number}` : '';
}

export function timeLabel(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return time;
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'Order placed',
  accepted: 'Accepted by store',
  packed: 'Packed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  rejected: 'Rejected by store',
};

/** The store's next step for an order, if any. */
export const NEXT_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  placed: { status: 'accepted', label: 'Accept' },
  accepted: { status: 'packed', label: 'Mark packed' },
  packed: { status: 'out_for_delivery', label: 'Out for delivery' },
  out_for_delivery: { status: 'delivered', label: 'Mark delivered' },
};
