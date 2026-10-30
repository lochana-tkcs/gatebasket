import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BillRows, StatusIcon, StatusPill, StatusTimeline } from '@/components/order-bits';
import { Card, Gradient, Loading, MetaRow, Row, SectionHeader, Txt, type IconName } from '@/components/ui';
import { useProfile } from '@/lib/auth';
import { flatLabel, NEXT_STATUS, rupees, timeLabel } from '@/lib/format';
import { useOrder, useOrdersRealtime } from '@/lib/queries';
import { useReorder } from '@/lib/reorder';
import { errorMessage, supabase } from '@/lib/supabase';
import { Colors, Fonts, Spacing } from '@/lib/theme';
import type { OrderStatus } from '@/lib/types';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfile();
  const order = useOrder(id);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { reorder, busy: reordering } = useReorder();
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

  // Bottom gradient action bar, like the "call | Allow Entry" bar on profile screens.
  let action: { label: string; icon: IconName; onPress: () => void } | null = null;
  if (isStore && next) action = { label: next.label, icon: 'arrow-forward-circle-outline', onPress: () => setStatus(next.status) };
  else if (!isStore && o.status === 'placed') action = { label: 'Cancel order', icon: 'close-circle-outline', onPress: cancel };
  else if (!isStore && !next) action = { label: 'Reorder', icon: 'refresh', onPress: () => reorder(o) };
  const phone = isStore ? o.resident?.phone : null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={order.isRefetching} onRefresh={() => void order.refetch()} />}>
        <Card style={styles.hero}>
          <StatusIcon status={o.status} size={84} />
          <Txt variant="title" style={{ fontFamily: Fonts.regular, fontSize: 24 }}>
            {isStore ? flatLabel(o.flat) : `Order #${o.order_no}`}
          </Txt>
          <Txt variant="section" style={{ fontSize: 13 }}>
            {isStore ? `#${o.order_no} · ${o.resident?.name ?? ''}` : `Placed ${timeLabel(o.created_at)}`}
          </Txt>
          <StatusPill status={o.status} />
        </Card>

        {o.note && (
          <Card style={{ gap: Spacing.sm }}>
            <MetaRow icon="chatbubble-ellipses-outline">{o.note}</MetaRow>
          </Card>
        )}

        <SectionHeader title="Order status" />
        <Card>
          <StatusTimeline order={o} />
        </Card>

        <SectionHeader title="Items" />
        <Card style={{ gap: Spacing.md }}>
          {o.order_items.map((item) => (
            <Row key={item.id} style={{ justifyContent: 'space-between', gap: Spacing.md }}>
              <Txt style={{ flex: 1 }}>
                <Text style={{ color: Colors.primary, fontFamily: Fonts.medium }}>{item.qty} ×</Text> {item.name_snapshot}
              </Txt>
              <Txt>{rupees(item.price_snapshot * item.qty)}</Txt>
            </Row>
          ))}
          <View style={styles.divider} />
          <BillRows order={o} />
        </Card>

        <SectionHeader title="Payment" />
        <Card style={{ gap: Spacing.md }}>
          <MetaRow icon="wallet-outline">
            {o.payment_mode === 'upi' ? 'UPI' : 'Cash'} on delivery · {o.paid ? 'Paid' : 'Not paid yet'}
          </MetaRow>
          {isStore && (
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt>Payment received</Txt>
              <Switch
                value={o.paid}
                disabled={busy}
                trackColor={{ true: Colors.primary }}
                onValueChange={(v) => run(() => supabase.rpc('set_order_paid', { p_order: id, p_paid: v }))}
              />
            </Row>
          )}
        </Card>

        {isStore && (o.status === 'placed' || o.status === 'accepted') && (
          <Pressable onPress={reject} disabled={busy} style={styles.rejectLink}>
            <Ionicons name="close-circle-outline" size={18} color={Colors.danger} />
            <Txt color={Colors.danger}>Reject this order</Txt>
          </Pressable>
        )}
      </ScrollView>

      {(action || phone) && (
        <Gradient style={[styles.actionBar, { paddingBottom: insets.bottom }]}>
          {phone && (
            <Pressable
              style={[styles.callButton, action && styles.callDivider]}
              onPress={() => Linking.openURL(`tel:+${phone}`)}
              accessibilityLabel="Call resident">
              <Ionicons name="call" size={26} color="#fff" />
            </Pressable>
          )}
          {action && (
            <Pressable style={styles.actionButton} onPress={action.onPress} disabled={busy || reordering}>
              {busy || reordering ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name={action.icon} size={22} color="#fff" />
                  <Text style={styles.actionText}>{action.label}</Text>
                </>
              )}
            </Pressable>
          )}
        </Gradient>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  hero: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  divider: { height: 1, backgroundColor: Colors.border },
  rejectLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: Spacing.md },
  actionBar: { flexDirection: 'row' },
  callButton: { width: 80, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg },
  callDivider: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.35)' },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  actionText: { fontFamily: Fonts.regular, fontSize: 19, color: '#fff' },
});
