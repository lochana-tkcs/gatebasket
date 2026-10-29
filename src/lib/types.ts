// Row shapes from supabase/migrations/0001_init.sql.

export type Role = 'resident' | 'store_owner' | 'admin';

export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'rejected';

export type PaymentMode = 'cash' | 'upi';

export type Flat = { id: string; block: string; number: string };

export type Profile = {
  id: string;
  phone: string | null;
  name: string | null;
  role: Role;
  society_id: string | null;
  flat_id: string | null;
  expo_push_token: string | null;
  flat: Flat | null;
  society: { name: string } | null;
};

export type Store = {
  id: string;
  society_id: string;
  owner_id: string | null;
  name: string;
  is_open: boolean;
  opening_hours: string;
  min_order: number;
  delivery_fee: number;
};

export type Category = { id: string; store_id: string; name: string; sort: number };

export type Product = {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  price: number;
  mrp: number | null;
  unit: string | null;
  image_url: string | null;
  in_stock: boolean;
  stock_qty: number | null;
};

export type OrderItem = {
  id: string;
  product_id: string | null;
  name_snapshot: string;
  price_snapshot: number;
  qty: number;
};

export type Order = {
  id: string;
  order_no: number;
  store_id: string;
  resident_id: string;
  flat_id: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_mode: PaymentMode;
  paid: boolean;
  note: string | null;
  created_at: string;
  accepted_at: string | null;
  packed_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  closed_at: string | null;
};

/** Order joined with its items, flat and (for the store) the customer. */
export type OrderWithDetails = Order & {
  order_items: OrderItem[];
  flat: Flat | null;
  resident: { name: string | null; phone: string | null } | null;
};

export const ORDER_SELECT =
  '*, order_items(*), flat:flats(id, block, number), resident:profiles!orders_resident_id_fkey(name, phone)';

export const ACTIVE_STATUSES: OrderStatus[] = ['placed', 'accepted', 'packed', 'out_for_delivery'];
