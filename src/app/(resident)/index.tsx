import { router } from 'expo-router';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';

import { OrderCard } from '@/components/order-bits';
import { Card, CardActions, IconCircle, Loading, MetaRow, Pill, Row, SectionHeader, Txt } from '@/components/ui';
import { cartSummary, useCart } from '@/lib/cart';
import { useMyStore, useOrders, useOrdersRealtime } from '@/lib/queries';
import { useReorder } from '@/lib/reorder';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing } from '@/lib/theme';
import type { OrderWithDetails } from '@/lib/types';

/** Activity feed: the store, live orders, then past orders. */
export default function ActivityScreen() {
  const store = useMyStore();
  const active = useOrders({ active: true });
  const past = useOrders({ active: false, limit: 20 });
  const cart = cartSummary(useCart((s) => s.lines));
  const { reorder } = useReorder();
  useOrdersRealtime();

  if (active.isLoading || past.isLoading) return <Loading />;

  const refresh = () => {
    store.refetch();
    active.refetch();
    past.refetch();
  };

  const cancel = (o: OrderWithDetails) =>
    Alert.alert('Cancel this order?', undefined, [
      { text: 'Keep order', style: 'cancel' },
      {
        text: 'Cancel order',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('cancel_order', { p_order: o.id });
          if (error) Alert.alert('Could not cancel', error.message);
          active.refetch();
          past.refetch();
        },
      },
    ]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl }}
      refreshControl={<RefreshControl refreshing={active.isRefetching || past.isRefetching} onRefresh={refresh} />}>
      {store.data && (
        <Card style={{ gap: Spacing.sm }}>
          <Row style={{ gap: Spacing.md, alignItems: 'flex-start' }}>
            <IconCircle icon="storefront" tint="red" size={44} />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt variant="heading">{store.data.name}</Txt>
              <Pill
                label={store.data.is_open ? 'Open now' : 'Closed'}
                color="#fff"
                bg={store.data.is_open ? Colors.green : Colors.textMuted}
              />
            </View>
          </Row>
          <View style={{ gap: 6 }}>
            <MetaRow icon="flash-outline">Delivered to your door in minutes</MetaRow>
            <MetaRow icon="time-outline">{store.data.opening_hours}</MetaRow>
          </View>
          <CardActions
            actions={[
              { label: 'Shop now', icon: 'basket-outline', tone: 'primary', onPress: () => router.push('/store') },
              {
                label: cart.count > 0 ? `Cart (${cart.count})` : 'Cart',
                icon: 'cart-outline',
                onPress: () => router.push(cart.count > 0 ? '/cart' : '/store'),
              },
            ]}
          />
        </Card>
      )}

      {!!active.data?.length && <SectionHeader title="Live orders" />}
      {active.data?.map((o) => (
        <OrderCard
          key={o.id}
          order={o}
          actions={[
            { label: 'Track', icon: 'navigate-outline', tone: 'primary', onPress: () => router.push(`/order/${o.id}`) },
            ...(o.status === 'placed'
              ? [{ label: 'Cancel', icon: 'close-circle-outline' as const, onPress: () => cancel(o) }]
              : []),
          ]}
        />
      ))}

      <SectionHeader title="Past orders" />
      {past.data?.length ? (
        past.data.map((o) => (
          <OrderCard
            key={o.id}
            order={o}
            actions={[
              { label: 'Details', icon: 'document-text-outline', onPress: () => router.push(`/order/${o.id}`) },
              { label: 'Reorder', icon: 'refresh', tone: 'primary', onPress: () => reorder(o) },
            ]}
          />
        ))
      ) : (
        <Card>
          <Txt color={Colors.textSecondary}>No orders yet. Your orders and their updates will show up here.</Txt>
        </Card>
      )}
    </ScrollView>
  );
}
