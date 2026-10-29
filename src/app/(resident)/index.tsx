import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OrderCard } from '@/components/order-bits';
import { Card, Row, Txt, type IconName } from '@/components/ui';
import { useProfile } from '@/lib/auth';
import { flatLabel } from '@/lib/format';
import { useMyStore, useOrders, useOrdersRealtime } from '@/lib/queries';
import { Colors, Radius, Spacing } from '@/lib/theme';

const QUICK_ACTIONS: { label: string; icon: IconName; ready?: boolean }[] = [
  { label: 'Store', icon: 'storefront', ready: true },
  { label: 'Visitors', icon: 'people' },
  { label: 'Daily Help', icon: 'person-add' },
  { label: 'Helpdesk', icon: 'construct' },
  { label: 'Notices', icon: 'megaphone' },
];

export default function HomeScreen() {
  const profile = useProfile();
  const store = useMyStore();
  const active = useOrders({ active: true });
  const recent = useOrders({ active: false, limit: 3 });
  useOrdersRealtime();

  const refreshing = store.isRefetching || active.isRefetching || recent.isRefetching;
  const refresh = () => {
    store.refetch();
    active.refetch();
    recent.refetch();
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.primary }}>
      <ScrollView
        style={{ backgroundColor: Colors.background }}
        contentContainerStyle={{ paddingBottom: Spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        {/* Header: flat + society, like a gate app */}
        <View style={styles.header}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Txt variant="title" color="#fff">
                {flatLabel(profile.flat)}
              </Txt>
              <Row style={{ gap: 4 }}>
                <Ionicons name="location" size={14} color="#D6F2EE" />
                <Txt color="#D6F2EE">{profile.society?.name}</Txt>
              </Row>
            </View>
            <Pressable hitSlop={10} onPress={() => Alert.alert('Notifications', 'Order updates arrive as push notifications.')}>
              <Ionicons name="notifications-outline" size={26} color="#fff" />
            </Pressable>
          </Row>
          <Txt color="#fff" style={{ marginTop: Spacing.md }}>
            Hi {profile.name?.split(' ')[0]} 👋
          </Txt>
        </View>

        <View style={styles.body}>
          {/* Quick actions */}
          <Card style={styles.quick}>
            {QUICK_ACTIONS.map((a) => (
              <Pressable
                key={a.label}
                style={styles.quickItem}
                onPress={() =>
                  a.ready ? router.push('/store') : Alert.alert(a.label, 'Coming soon to GateBasket.')
                }>
                <View style={[styles.quickIcon, !a.ready && { backgroundColor: Colors.background }]}>
                  <Ionicons name={a.icon} size={22} color={a.ready ? Colors.primary : Colors.textMuted} />
                </View>
                <Txt variant="caption" color={a.ready ? Colors.text : Colors.textMuted} style={{ textAlign: 'center' }}>
                  {a.label}
                </Txt>
                {!a.ready && <Txt variant="caption" style={styles.soon}>Soon</Txt>}
              </Pressable>
            ))}
          </Card>

          {/* Community store banner */}
          <Pressable onPress={() => router.push('/store')}>
            <View style={styles.banner}>
              <View style={{ flex: 1, gap: 4 }}>
                <Txt variant="label" color={Colors.primaryDark}>
                  COMMUNITY STORE
                </Txt>
                <Txt variant="heading">{store.data?.name ?? 'Your society store'}</Txt>
                <Txt color={Colors.textSecondary}>Delivered to your door in minutes</Txt>
                {store.data && (
                  <Row style={{ gap: 6, marginTop: 4 }}>
                    <View
                      style={[styles.dot, { backgroundColor: store.data.is_open ? Colors.success : Colors.danger }]}
                    />
                    <Txt variant="caption" color={store.data.is_open ? Colors.success : Colors.danger}>
                      {store.data.is_open ? `Open · ${store.data.opening_hours}` : 'Closed now'}
                    </Txt>
                  </Row>
                )}
              </View>
              <View style={styles.bannerIcon}>
                <Ionicons name="basket" size={36} color="#fff" />
              </View>
            </View>
          </Pressable>

          {/* Updates feed */}
          <Txt variant="heading" style={{ marginTop: Spacing.sm }}>
            Updates
          </Txt>
          {active.data?.map((o) => <OrderCard key={o.id} order={o} />)}
          {recent.data?.map((o) => <OrderCard key={o.id} order={o} />)}
          {!active.data?.length && !recent.data?.length && (
            <Card>
              <Txt color={Colors.textSecondary}>No updates yet. Your order updates will show up here.</Txt>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl + Spacing.xl,
  },
  body: { paddingHorizontal: Spacing.lg, gap: Spacing.lg, marginTop: -Spacing.xxl },
  quick: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.sm },
  quickItem: { alignItems: 'center', gap: 6, flex: 1 },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soon: { fontSize: 9, color: Colors.accent, fontWeight: '700', marginTop: -4 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.accentSoft,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#F7D9A6',
  },
  bannerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
