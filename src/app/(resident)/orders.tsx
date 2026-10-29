import { FlatList, RefreshControl } from 'react-native';

import { OrderCard } from '@/components/order-bits';
import { EmptyState, Loading } from '@/components/ui';
import { useOrders, useOrdersRealtime } from '@/lib/queries';
import { Spacing } from '@/lib/theme';

export default function OrdersScreen() {
  const orders = useOrders();
  useOrdersRealtime();

  if (orders.isLoading) return <Loading />;
  return (
    <FlatList
      data={orders.data}
      keyExtractor={(o) => o.id}
      contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={orders.isRefetching} onRefresh={() => void orders.refetch()} />}
      ListEmptyComponent={
        <EmptyState icon="receipt-outline" title="No orders yet" subtitle="Order from your community store and track it here." />
      }
      renderItem={({ item }) => <OrderCard order={item} />}
    />
  );
}
