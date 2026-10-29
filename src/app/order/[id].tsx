import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { BillRows, StatusBadge, StatusTimeline } from '@/components/order-bits';
import { Button, Card, Loading, Row, Txt } from '@/components/ui';
import { useProfile } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { flatLabel, NEXT_STATUS, rupees, timeLabel } from '@/lib/format';
import { useOrder, useOrdersRealtime } from '@/lib/queries';
import { errorMessage, supabase } from '@/lib/supabase';
import { Colors, Spacing } from '@/lib/theme';
import type { OrderStatus, OrderWithDetails, Product } from '@/lib/types';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfile();
  const order = useOrder(id);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  useOrdersRealtime();

  if (order.isLoading || !order.data) return <Loading />;
  const o = order.data;
  const isStore = profile.role === 'store_owner';
  const next = NEXT_STATUS[o.status];

  async function run(fn: () => PromiseLike<{ error: unknown }>) {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) Alert.alert('Something went wrong', errorMessage(error));
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['order', id] });
  }

  const setStatus = (status: OrderStatus) =>
    run(() => supabase.rpc('update_order_status', { p_order: id, p_status: status }));

  const reject = () =>
    Alert.alert('Reject this order?', 'The resident will be notified.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => setStatus('rejected') },
    ]);

  const cancel = () =>
    Alert.alert('Cancel this order?', undefined, [
      { text: 'Keep order', style: 'cancel' },
      { text: 'Cancel order', style: 'destructive', onPress: () => run(() => supabase.rpc('cancel_order', { p_order: id })) },
    ]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={order.isRefetching} onRefresh={() => void order.refetch()} />}>
      <Card style={{ gap: Spacing.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="heading">Order #{o.order_no}</Txt>
          <StatusBadge status={o.status} />
        </Row>
        <Txt variant="caption">Placed {timeLabel(o.created_at)}</Txt>
      </Card>

      {isStore && (
        <Card style={{ gap: Spacing.sm }}>
          <Txt variant="label">DELIVER TO</Txt>
          <Txt variant="heading">{flatLabel(o.flat)}</Txt>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt>{o.resident?.name}</Txt>
            {o.resident?.phone && (
              <Button
                title="Call"
                icon="call"
                variant="secondary"
                onPress={() => Linking.openURL(`tel:+${o.resident!.phone}`)}
              />
            )}
          </Row>
        </Card>
      )}

      {o.note && (
        <Card style={{ flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.accentSoft }}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#B26B00" />
          <Txt style={{ flex: 1 }}>{o.note}</Txt>
        </Card>
      )}

      <Card>
        <StatusTimeline order={o} />
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <Txt variant="label">ITEMS</Txt>
        {o.order_items.map((item) => (
          <Row key={item.id} style={{ justifyContent: 'space-between', gap: Spacing.md }}>
            <Txt style={{ flex: 1 }}>
              {item.qty} × {item.name_snapshot}
            </Txt>
            <Txt>{rupees(item.price_snapshot * item.qty)}</Txt>
          </Row>
        ))}
        <BillRows order={o} />
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt color={Colors.textSecondary}>Payment</Txt>
          <Txt style={{ fontWeight: '600' }}>
            {o.payment_mode.toUpperCase()} on delivery · {o.paid ? 'Paid' : 'Not paid yet'}
          </Txt>
        </Row>
        {isStore && (
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt style={{ fontWeight: '600' }}>Payment received</Txt>
            <Switch
              value={o.paid}
              disabled={busy}
              trackColor={{ true: Colors.primary }}
              onValueChange={(v) => run(() => supabase.rpc('set_order_paid', { p_order: id, p_paid: v }))}
            />
          </Row>
        )}
      </Card>

      {isStore && next && (
        <View style={{ gap: Spacing.sm }}>
          <Button title={next.label} onPress={() => setStatus(next.status)} loading={busy} />
          {(o.status === 'placed' || o.status === 'accepted') && (
            <Button title="Reject order" variant="danger" onPress={reject} disabled={busy} />
          )}
        </View>
      )}

      {!isStore && o.status === 'placed' && (
        <Button title="Cancel order" variant="danger" onPress={cancel} loading={busy} />
      )}
      {!isStore && !next && <ReorderButton order={o} />}
    </ScrollView>
  );
}

/** Put the order's still-available items back in the cart. */
function ReorderButton({ order }: { order: OrderWithDetails }) {
  const setQty = useCart((s) => s.setQty);
  const clear = useCart((s) => s.clear);
  const [busy, setBusy] = useState(false);

  async function reorder() {
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

  return <Button title="Reorder" icon="refresh" variant="secondary" onPress={reorder} loading={busy} />;
}

const styles = StyleSheet.create({
  container: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
});
