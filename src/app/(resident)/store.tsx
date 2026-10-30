import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/product-card';
import { Chip, EmptyState, Gradient, Loading, Row, Txt } from '@/components/ui';
import { cartSummary, useCart } from '@/lib/cart';
import { rupees } from '@/lib/format';
import { useCatalog, useMyStore } from '@/lib/queries';
import { Colors, Fonts, Radius, Spacing } from '@/lib/theme';

export default function StoreScreen() {
  const store = useMyStore();
  const catalog = useCatalog(store.data?.id);
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const cart = cartSummary(lines);

  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();

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
          <Txt color={Colors.danger} style={{ fontFamily: Fonts.medium }}>
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
        <Pressable style={styles.cartBarWrap} onPress={() => router.push('/cart')}>
          <Gradient style={[styles.cartBar, { paddingBottom: Spacing.lg + insets.bottom }]}>
            <Row style={{ gap: Spacing.md }}>
              <Ionicons name="cart" size={24} color="#fff" />
              <View>
                <Txt color="#fff" style={{ fontFamily: Fonts.medium }}>
                  {cart.count} item{cart.count === 1 ? '' : 's'} · {rupees(cart.subtotal)}
                </Txt>
                <Txt variant="caption" color={Colors.headerTextDim}>
                  Delivered to your door
                </Txt>
              </View>
            </Row>
            <Row style={{ gap: 4 }}>
              <Txt color="#fff" style={{ fontFamily: Fonts.medium, fontSize: 16 }}>
                View cart
              </Txt>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </Row>
          </Gradient>
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
  search: { flex: 1, paddingVertical: Spacing.md, fontSize: 15, fontFamily: Fonts.regular, color: Colors.text },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  cartBarWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  cartBar: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
