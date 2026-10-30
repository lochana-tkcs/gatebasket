import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { useCart } from './cart';
import { errorMessage, supabase } from './supabase';
import type { OrderWithDetails, Product } from './types';

/** Put an order's still-available items back in the cart and open it. */
export function useReorder() {
  const setQty = useCart((s) => s.setQty);
  const clear = useCart((s) => s.clear);
  const [busy, setBusy] = useState(false);

  async function reorder(order: OrderWithDetails) {
    setBusy(true);
    const ids = order.order_items.map((i) => i.product_id).filter((x): x is string => !!x);
    const { data, error } = await supabase.from('products').select('*').in('id', ids);
    setBusy(false);
    if (error) {
      Alert.alert('Error', errorMessage(error));
      return;
    }
    const available = (data as Product[]).filter((p) => p.in_stock);
    if (available.length === 0) {
      Alert.alert('Nothing to reorder', 'These items are out of stock right now.');
      return;
    }
    clear();
    for (const item of order.order_items) {
      const p = available.find((x) => x.id === item.product_id);
      if (p) setQty(p, p.stock_qty != null ? Math.min(item.qty, p.stock_qty) : item.qty);
    }
    router.push('/cart');
  }

  return { reorder, busy };
}
