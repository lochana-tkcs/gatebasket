import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ProductCard } from '@/components/product-card';
import { Chip, EmptyState, Loading, Row, Txt } from '@/components/ui';
import { cartSummary, useCart } from '@/lib/cart';
import { rupees } from '@/lib/format';
import { useCatalog, useMyStore } from '@/lib/queries';
import { Colors, Radius, Shadow, Spacing } from '@/lib/theme';

export default function StoreScreen() {
  const store = useMyStore();
  const catalog = useCatalog(store.data?.id);
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const cart = cartSummary(lines);

  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const navigation = useNavigation();
  const storeName = store.data?.name;
  useEffect(() => {
    if (storeName) navigation.setOptions({ title: storeName });
  }, [navigation, storeName]);

  const products = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (catalog.data?.products ?? [])
      .filter((p) => (category ? p.category_id === category : true))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
      // In-stock items first.
      .sort((a, b) => Number(b.in_stock) - Number(a.in_stock));
  }, [catalog.data, category, search]);

  if (store.isLoading || catalog.isLoading) return <Loading />;
  if (!store.data) return <EmptyState icon="storefront-outline" title="No store yet" subtitle="Your society's store hasn't joined yet." />;

  return (
    <View style={{ flex: 1 }}>
      {!store.data.is_open && (
        <View style={styles.closed}>
          <Ionicons name="moon" size={16} color={Colors.danger} />
          <Txt color={Colors.danger} style={{ fontWeight: '600' }}>
            Store is closed · Opens {store.data.opening_hours}
          </Txt>
        </View>
      )}

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search milk, bread, eggs…"
          placeholderTextColor={Colors.textMuted}
          style={styles.search}
        />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="All" selected={!category} onPress={() => setCategory(null)} />
          {catalog.data?.categories.map((c) => (
            <Chip key={c.id} label={c.name} selected={category === c.id} onPress={() => setCategory(c.id)} />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: Spacing.md }}
        contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={catalog.isRefetching} onRefresh={() => void catalog.refetch()} />}
        ListEmptyComponent={<EmptyState icon="search" title="No products found" />}
        renderItem={({ item }) => (
          <ProductCard product={item} qty={lines[item.id]?.qty ?? 0} onChangeQty={(q) => setQty(item, q)} />
        )}
      />

      {cart.count > 0 && (
        <Pressable style={styles.cartBar} onPress={() => router.push('/cart')}>
          <View>
            <Txt color="#fff" style={{ fontWeight: '700' }}>
              {cart.count} item{cart.count === 1 ? '' : 's'} · {rupees(cart.subtotal)}
            </Txt>
            <Txt variant="caption" color="#D6F2EE">
              Delivered to your door
            </Txt>
          </View>
          <Row style={{ gap: 4 }}>
            <Txt color="#fff" style={{ fontWeight: '700' }}>
              View cart
            </Txt>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </Row>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  closed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.dangerSoft,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    margin: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  search: { flex: 1, paddingVertical: Spacing.md, fontSize: 15, color: Colors.text },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  cartBar: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadow,
  },
});
