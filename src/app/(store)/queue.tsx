import { useQueryClient } from '@tanstack/react-query';
import { useAudioPlayer } from 'expo-audio';
import { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Vibration, View } from 'react-native';

import { OrderCard } from '@/components/order-bits';
import { Card, Chip, EmptyState, IconCircle, Loading, Row, Txt } from '@/components/ui';
import { NEXT_STATUS, rupees } from '@/lib/format';
import { useMyStore, useOrders, useOrdersRealtime } from '@/lib/queries';
import { errorMessage, supabase } from '@/lib/supabase';
import { Colors, Fonts, Spacing } from '@/lib/theme';
import type { OrderWithDetails } from '@/lib/types';

const alertSound = require('@/assets/sounds/new-order.wav');

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export default function OrderQueueScreen() {
  const [tab, setTab] = useState<'active' | 'done'>('active');
  const store = useMyStore();
  const active = useOrders({ active: true });
  const done = useOrders({ active: false, limit: 50 });
  const queryClient = useQueryClient();
  const player = useAudioPlayer(alertSound);

  // Loud alert for every new order.
  const onNewOrder = useCallback(() => {
    Vibration.vibrate([0, 500, 200, 500]);
    player.seekTo(0);
    player.play();
  }, [player]);
  useOrdersRealtime(onNewOrder);

  if (store.isLoading || active.isLoading) return <Loading />;
  if (!store.data) {
    return <EmptyState icon="storefront-outline" title="No store linked" subtitle="Ask the admin to link your store." />;
  }

  // Today's numbers: everything not cancelled/rejected counts as a sale.
  const todays = [...(active.data ?? []), ...(done.data ?? [])].filter(
    (o) => isToday(o.created_at) && o.status !== 'cancelled' && o.status !== 'rejected',
  );
  const revenue = todays.reduce((n, o) => n + Number(o.total), 0);

  async function advance(order: OrderWithDetails) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    const { error } = await supabase.rpc('update_order_status', { p_order: order.id, p_status: next.status });
    if (error) Alert.alert('Could not update', errorMessage(error));
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }

  const reject = (order: OrderWithDetails) =>
    Alert.alert('Reject this order?', 'The resident will be notified.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('update_order_status', { p_order: order.id, p_status: 'rejected' });
          if (error) Alert.alert('Could not update', errorMessage(error));
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
      },
    ]);

  const list = tab === 'active' ? active : done;

  return (
    <FlatList
      data={list.data}
      keyExtractor={(o) => o.id}
      contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, flexGrow: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={active.isRefetching || done.isRefetching}
          onRefresh={() => {
            active.refetch();
            done.refetch();
          }}
        />
      }
      ListHeaderComponent={
        <View style={{ gap: Spacing.md }}>
          {!store.data.is_open && (
            <Card style={{ backgroundColor: Colors.dangerSoft }}>
              <Txt color={Colors.danger} style={{ fontFamily: Fonts.medium }}>
                Your store is closed. Residents can{"'"}t order. Open it from Settings.
              </Txt>
            </Card>
          )}
          <Row style={{ gap: Spacing.md }}>
            <Card style={styles.stat}>
              <IconCircle icon="receipt" tint="yellow" size={40} />
              <View>
                <Txt variant="title">{todays.length}</Txt>
                <Txt variant="section" style={{ fontSize: 11 }}>Orders today</Txt>
              </View>
            </Card>
            <Card style={styles.stat}>
              <IconCircle icon="cash" tint="green" size={40} />
              <View>
                <Txt variant="title">{rupees(revenue)}</Txt>
                <Txt variant="section" style={{ fontSize: 11 }}>Sales today</Txt>
              </View>
            </Card>
          </Row>
          <Row style={{ gap: Spacing.sm }}>
            <Chip label={`Active (${active.data?.length ?? 0})`} selected={tab === 'active'} onPress={() => setTab('active')} />
            <Chip label="Completed" selected={tab === 'done'} onPress={() => setTab('done')} />
          </Row>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="cafe-outline"
          title={tab === 'active' ? 'No active orders' : 'No completed orders'}
          subtitle={tab === 'active' ? "New orders will ring here." : undefined}
        />
      }
      renderItem={({ item }) => {
        const next = NEXT_STATUS[item.status];
        const actions = [];
        if (item.status === 'placed') {
          actions.push({ label: 'Reject', icon: 'close-circle-outline' as const, tone: 'danger' as const, onPress: () => reject(item) });
        }
        if (next) {
          actions.push({ label: next.label, icon: 'checkmark-circle-outline' as const, tone: 'primary' as const, onPress: () => advance(item) });
        }
        return <OrderCard order={item} showFlat actions={actions} />;
      }}
    />
  );
}

const styles = StyleSheet.create({
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
