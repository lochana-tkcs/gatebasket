import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { flatLabel, rupees, STATUS_LABEL, timeLabel } from '@/lib/format';
import { Colors, Spacing } from '@/lib/theme';
import type { Order, OrderStatus, OrderWithDetails } from '@/lib/types';

import { Badge, Card, Row, Txt } from './ui';

export function StatusBadge({ status }: { status: OrderStatus }) {
  const tone =
    status === 'delivered'
      ? { color: Colors.success, bg: Colors.successSoft }
      : status === 'cancelled' || status === 'rejected'
        ? { color: Colors.danger, bg: Colors.dangerSoft }
        : status === 'placed'
          ? { color: '#B26B00', bg: Colors.accentSoft }
          : { color: Colors.primaryDark, bg: Colors.primarySoft };
  return <Badge label={STATUS_LABEL[status]} {...tone} />;
}

const STEPS: { status: OrderStatus; at: keyof Order; icon: 'receipt-outline' | 'checkmark-circle-outline' | 'cube-outline' | 'bicycle-outline' | 'home-outline' }[] = [
  { status: 'placed', at: 'created_at', icon: 'receipt-outline' },
  { status: 'accepted', at: 'accepted_at', icon: 'checkmark-circle-outline' },
  { status: 'packed', at: 'packed_at', icon: 'cube-outline' },
  { status: 'out_for_delivery', at: 'out_for_delivery_at', icon: 'bicycle-outline' },
  { status: 'delivered', at: 'delivered_at', icon: 'home-outline' },
];

export function StatusTimeline({ order }: { order: Order }) {
  if (order.status === 'cancelled' || order.status === 'rejected') {
    return (
      <Row style={{ gap: Spacing.sm }}>
        <Ionicons name="close-circle" size={24} color={Colors.danger} />
        <Txt variant="heading" color={Colors.danger}>
          {STATUS_LABEL[order.status]}
        </Txt>
        <Txt variant="caption">{timeLabel(order.closed_at)}</Txt>
      </Row>
    );
  }
  return (
    <View>
      {STEPS.map((step, i) => {
        const at = order[step.at] as string | null;
        const done = !!at;
        const last = i === STEPS.length - 1;
        return (
          <View key={step.status} style={styles.step}>
            <View style={styles.rail}>
              <View style={[styles.dot, done && styles.dotDone]}>
                <Ionicons name={step.icon} size={16} color={done ? '#fff' : Colors.textMuted} />
              </View>
              {!last && <View style={[styles.line, done && styles.lineDone]} />}
            </View>
            <View style={styles.stepText}>
              <Txt style={{ fontWeight: done ? '700' : '400' }} color={done ? Colors.text : Colors.textMuted}>
                {STATUS_LABEL[step.status]}
              </Txt>
              {done && <Txt variant="caption">{timeLabel(at)}</Txt>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function OrderCard({ order, showFlat }: { order: OrderWithDetails; showFlat?: boolean }) {
  const itemCount = order.order_items.reduce((n, i) => n + i.qty, 0);
  return (
    <Pressable onPress={() => router.push(`/order/${order.id}`)}>
      <Card style={{ gap: Spacing.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="heading">Order #{order.order_no}</Txt>
          <StatusBadge status={order.status} />
        </Row>
        {showFlat && (
          <Txt style={{ fontWeight: '600' }}>
            {flatLabel(order.flat)}
            {order.resident?.name ? ` · ${order.resident.name}` : ''}
          </Txt>
        )}
        <Txt color={Colors.textSecondary} numberOfLines={1}>
          {order.order_items.map((i) => `${i.qty} × ${i.name_snapshot}`).join(', ')}
        </Txt>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="caption">
            {timeLabel(order.created_at)} · {itemCount} item{itemCount === 1 ? '' : 's'}
          </Txt>
          <Txt style={{ fontWeight: '700' }}>
            {rupees(order.total)} · {order.payment_mode.toUpperCase()}
          </Txt>
        </Row>
      </Card>
    </Pressable>
  );
}

export function BillRows({ order }: { order: Pick<Order, 'subtotal' | 'delivery_fee' | 'total'> }) {
  return (
    <View style={{ gap: Spacing.xs }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt color={Colors.textSecondary}>Item total</Txt>
        <Txt>{rupees(order.subtotal)}</Txt>
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt color={Colors.textSecondary}>Delivery fee</Txt>
        <Txt color={Number(order.delivery_fee) === 0 ? Colors.success : Colors.text}>
          {Number(order.delivery_fee) === 0 ? 'FREE' : rupees(order.delivery_fee)}
        </Txt>
      </Row>
      <View style={styles.divider} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="heading">To pay</Txt>
        <Txt variant="heading">{rupees(order.total)}</Txt>
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: Spacing.md },
  rail: { alignItems: 'center' },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: Colors.primary },
  line: { width: 2, flex: 1, minHeight: 20, backgroundColor: Colors.border },
  lineDone: { backgroundColor: Colors.primary },
  stepText: { paddingBottom: Spacing.lg, paddingTop: 4 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
});
