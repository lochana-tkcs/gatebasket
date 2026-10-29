import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import { useProfile } from './auth';
import { supabase } from './supabase';
import { ACTIVE_STATUSES, ORDER_SELECT, type Category, type OrderWithDetails, type Product, type Store } from './types';

/** The resident's society store, or the store the owner runs. */
export function useMyStore() {
  const profile = useProfile();
  return useQuery({
    queryKey: ['store', profile.id],
    queryFn: async () => {
      let q = supabase.from('stores').select('*');
      q = profile.role === 'store_owner' ? q.eq('owner_id', profile.id) : q.eq('society_id', profile.society_id!);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data as Store | null;
    },
  });
}

export function useCatalog(storeId: string | undefined) {
  return useQuery({
    queryKey: ['catalog', storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const [cats, prods] = await Promise.all([
        supabase.from('categories').select('*').eq('store_id', storeId!).order('sort'),
        supabase.from('products').select('*').eq('store_id', storeId!).order('name'),
      ]);
      if (cats.error) throw cats.error;
      if (prods.error) throw prods.error;
      return { categories: cats.data as Category[], products: prods.data as Product[] };
    },
  });
}

/** Orders visible to the signed-in user (RLS limits residents to theirs, owners to their store's). */
export function useOrders(opts: { active?: boolean; limit?: number } = {}) {
  const profile = useProfile();
  return useQuery({
    queryKey: ['orders', profile.id, opts],
    queryFn: async () => {
      let q = supabase.from('orders').select(ORDER_SELECT).order('created_at', { ascending: false });
      if (opts.active === true) q = q.in('status', ACTIVE_STATUSES);
      if (opts.active === false) q = q.not('status', 'in', `(${ACTIVE_STATUSES.join(',')})`);
      if (opts.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as OrderWithDetails[];
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select(ORDER_SELECT).eq('id', id).single();
      if (error) throw error;
      return data as unknown as OrderWithDetails;
    },
  });
}

/**
 * Refetch order queries whenever an order visible to this user changes.
 * Realtime applies RLS, so each user only hears about their own orders.
 */
export function useOrdersRealtime(onInsert?: () => void) {
  const queryClient = useQueryClient();
  const profile = useProfile();
  // Several mounted screens can subscribe at once, so each needs its own channel.
  const instance = useId();
  useEffect(() => {
    const channel = supabase
      .channel(`orders-${profile.id}-${instance}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        const id = (payload.new as { id?: string })?.id;
        if (id) queryClient.invalidateQueries({ queryKey: ['order', id] });
        if (payload.eventType === 'INSERT') onInsert?.();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile.id, instance, queryClient, onInsert]);
}
