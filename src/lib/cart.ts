import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Product } from './types';

type CartLine = { product: Product; qty: number };

type CartState = {
  lines: Record<string, CartLine>;
  setQty: (product: Product, qty: number) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: {},
      setQty: (product, qty) =>
        set((s) => {
          const lines = { ...s.lines };
          if (qty <= 0) delete lines[product.id];
          else lines[product.id] = { product, qty };
          return { lines };
        }),
      clear: () => set({ lines: {} }),
    }),
    { name: 'gatebasket-cart', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export function cartSummary(lines: Record<string, CartLine>) {
  const list = Object.values(lines);
  return {
    list,
    count: list.reduce((n, l) => n + l.qty, 0),
    subtotal: list.reduce((n, l) => n + Number(l.product.price) * l.qty, 0),
  };
}
