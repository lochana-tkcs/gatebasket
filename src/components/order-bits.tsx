import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { flatLabel, rupees, STATUS_LABEL, timeLabel } from '@/lib/format';
import { Colors, Fonts, Spacing, type IconTint } from '@/lib/theme';
import { ACTIVE_STATUSES, type Order, type OrderStatus, type OrderWithDetails } from '@/lib/types';

import { Card, CardActions, IconCircle, MetaRow, Pill, Row, Txt, type IconName } from './ui';

const STATUS_STYLE: Record<OrderStatus, { icon: IconName; tint: IconTint; pill: string; color: string; bg: string; muted?: boolean }> = {
  placed: { icon: 'receipt', tint: 'yellow', pill: 'Placed', color: '#B57D00', bg: Colors.accentSoft },
  accepted: { icon: 'checkmark-done', tint: 'blue', pill: 'Accepted', color: '#fff', bg: Colors.blue },
  packed: { icon: 'cube', tint: 'blue', pill: 'Packed', color: '#fff', bg: Colors.blue },
  out_for_delivery: { icon: 'bicycle', tint: 'pink', pill: 'On the way', color: '#fff', bg: Colors.primary },
  delivered: { icon: 'home', tint: 'green', pill: 'Delivered', color: Colors.green, bg: Colors.greenSoft },
  cancelled: { icon: 'close', tint: 'red', pill: 'Cancelled', color: Colors.textSecondary, bg: Colors.border, muted: true },
  rejected: { icon: 'close', tint: 'red', pill: 'Rejected', color: Colors.danger, bg: Colors.dangerSoft, muted: true },
};

export function StatusPill({ status }: { status: OrderStatus }) {
  const s = STATUS_STYLE[status];
  return <Pill label={s.pill} color={s.color} bg={s.bg} />;
}

export function StatusIcon({ status, size = 48 }: { status: OrderStatus; size?: number }) {
  const s = STATUS_STYLE[status];
  return <IconCircle icon={s.icon} tint={s.tint} muted={s.muted} size={size} />;
}

type CardAction = ComponentProps<typeof CardActions>['actions'][number];

/** Activity-feed style order card: status icon, title + pill, detail lines, split actions. */
export function OrderCard({
  order,
  showFlat,
  actions,
}: {
  order: OrderWithDetails;
  showFlat?: boolean;
  actions?: CardAction[];
}) {
  const itemCount = order.order_items.reduce((n, i) => n + i.qty, 0);
  const open = () => router.push(`/order/${order.id}`);
  const active = ACTIVE_STATUSES.includes(order.status);
  return (
    <Card style={{ gap: Spacing.sm }}>
      <Pressable onPress={open} style={{ gap: Spacing.sm }}>
        <Row style={{ gap: Spacing.md, alignItems: 'flex-start' }}>
          <StatusIcon status={order.status} size={44} />
          <View style={{ flex: 1, gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt variant="heading">
                {showFlat ? flatLabel(order.flat) : `Order #${order.order_no}`}
              </Txt>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </Row>
            <Row style={{ gap: Spacing.sm }}>
              <StatusPill status={order.status} />
              {showFlat && <Txt variant="caption">#{order.order_no}</Txt>}
              {!showFlat && active && <Txt variant="caption">{timeLabel(order.created_at)}</Txt>}
            </Row>
          </View>
        </Row>
        <View style={{ gap: 6, paddingLeft: 2 }}>
          <MetaRow icon="basket-outline">
            {itemCount} item{itemCount === 1 ? '' : 's'} · {order.order_items.map((i) => i.name_snapshot).join(', ')}
          </MetaRow>
          {showFlat && order.resident?.name && <MetaRow icon="person-outline">{order.resident.name}</MetaRow>}
          <MetaRow icon="wallet-outline">
            {rupees(order.total)} · {order.payment_mode === 'upi' ? 'UPI' : 'Cash'} on delivery{order.paid ? ' · Paid' : ''}
          </MetaRow>
          {(showFlat || !active) && <MetaRow icon="time-outline">{timeLabel(order.created_at)}</MetaRow>}
          {order.note && <MetaRow icon="chatbubble-ellipses-outline">{order.note}</MetaRow>}
        </View>
      </Pressable>
      {actions && actions.length > 0 && <CardActions actions={actions} />}
    </Card>
  );
}

const STEPS: { status: OrderStatus; at: keyof Order; icon: IconName }[] = [
  { status: 'placed', at: 'created_at', icon: 'receipt' },
  { status: 'accepted', at: 'accepted_at', icon: 'checkmark-done' },
  { status: 'packed', at: 'packed_at', icon: 'cube' },
  { status: 'out_for_delivery', at: 'out_for_delivery_at', icon: 'bicycle' },
  { status: 'delivered', at: 'delivered_at', icon: 'home' },
];

export function StatusTimeline({ order }: { order: Order }) {
  if (order.status === 'cancelled' || order.status === 'rejected') {
    return (
      <Row style={{ gap: Spacing.md }}>
        <StatusIcon status={order.status} size={40} />
        <View style={{ flex: 1 }}>
          <Txt variant="heading" color={Colors.danger}>
            {STATUS_LABEL[order.status]}
          </Txt>
          {order.cancel_reason === 'store_timeout' && (
            <Txt color={Colors.textSecondary}>The store didn&apos;t respond in time, so it was cancelled automatically.</Txt>
          )}
          <Txt variant="caption">{timeLabel(order.closed_at)}</Txt>
        </View>
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
              {done ? (
                <IconCircle icon={step.icon} tint="pink" size={30} />
              ) : (
                <View style={styles.dot}>
                  <Ionicons name={step.icon} size={14} color={Colors.textMuted} />
                </View>
              )}
              {!last && <View style={[styles.line, done && styles.lineDone]} />}
            </View>
            <View style={styles.stepText}>
              <Txt style={{ fontFamily: done ? Fonts.medium : Fonts.regular }} color={done ? Colors.text : Colors.textMuted}>
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

export function BillRows({ order }: { order: Pick<Order, 'subtotal' | 'delivery_fee' | 'total'> }) {
  return (
    <View style={{ gap: Spacing.xs }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt color={Colors.textSecondary}>Item total</Txt>
        <Txt>{rupees(order.subtotal)}</Txt>
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt color={Colors.textSecondary}>Delivery fee</Txt>
        <Txt color={Number(order.delivery_fee) === 0 ? Colors.green : Colors.text}>
          {Number(order.delivery_fee) === 0 ? 'FREE' : rupees(order.delivery_fee)}
        </Txt>
      </Row>
      <View style={styles.divider} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="heading" style={{ fontFamily: Fonts.medium }}>
          To pay
        </Txt>
        <Txt variant="heading" style={{ fontFamily: Fonts.medium }}>
          {rupees(order.total)}
        </Txt>
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: Spacing.md },
  rail: { alignItems: 'center', width: 30 },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { width: 2, flex: 1, minHeight: 18, backgroundColor: Colors.border },
  lineDone: { backgroundColor: Colors.primary },
  stepText: { paddingBottom: Spacing.lg, paddingTop: 5 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
});
