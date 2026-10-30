import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Switch, TextInput, View } from 'react-native';

import { ProductImage } from '@/components/product-card';
import { EmptyState, Loading, Row, Txt } from '@/components/ui';
import { rupees } from '@/lib/format';
import { useCatalog, useMyStore } from '@/lib/queries';
import { errorMessage, supabase } from '@/lib/supabase';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/lib/theme';
import type { Product } from '@/lib/types';

export default function CatalogScreen() {
  const store = useMyStore();
  const catalog = useCatalog(store.data?.id);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const products = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (catalog.data?.products ?? []).filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [catalog.data, search]);

  const categoryName = (id: string | null) => catalog.data?.categories.find((c) => c.id === id)?.name ?? 'Uncategorised';

  // One tap to mark in/out of stock, updated optimistically so it feels instant.
  async function toggleStock(p: Product, inStock: boolean) {
    const key = ['catalog', store.data?.id];
    queryClient.setQueryData(key, (old: typeof catalog.data) =>
      old && { ...old, products: old.products.map((x) => (x.id === p.id ? { ...x, in_stock: inStock } : x)) },
    );
    const update: Partial<Product> = { in_stock: inStock };
    // Turning a tracked item back on with zero stock would block every order; stop tracking instead.
    if (inStock && p.stock_qty === 0) update.stock_qty = null;
    const { error } = await supabase.from('products').update(update).eq('id', p.id);
    if (error) Alert.alert('Could not update', errorMessage(error));
    queryClient.invalidateQueries({ queryKey: key });
  }

  if (store.isLoading || catalog.isLoading) return <Loading />;

  const outCount = products.filter((p) => !p.in_stock).length;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search products"
          placeholderTextColor={Colors.textMuted}
          style={styles.search}
        />
      </View>
      <Txt variant="caption" style={{ paddingHorizontal: Spacing.lg }}>
        {products.length} products · {outCount} out of stock
      </Txt>

      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={catalog.isRefetching} onRefresh={() => void catalog.refetch()} />}
        ListEmptyComponent={<EmptyState icon="pricetags-outline" title="No products" subtitle="Tap + to add your first product." />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/product-edit', params: { id: item.id } })}
            style={[styles.row, !item.in_stock && { opacity: 0.6 }]}>
            <ProductImage uri={item.image_url} size={48} />
            <View style={{ flex: 1 }}>
              <Txt numberOfLines={1} style={{ fontFamily: Fonts.medium }}>
                {item.name}
              </Txt>
              <Txt variant="caption">
                {rupees(item.price)} · {item.unit} · {categoryName(item.category_id)}
                {item.stock_qty != null ? ` · ${item.stock_qty} left` : ''}
              </Txt>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Switch
                value={item.in_stock}
                onValueChange={(v) => toggleStock(item, v)}
                trackColor={{ true: Colors.primary }}
              />
              <Txt variant="caption" color={item.in_stock ? Colors.success : Colors.danger}>
                {item.in_stock ? 'In stock' : 'Out'}
              </Txt>
            </View>
          </Pressable>
        )}
      />

      <Pressable style={styles.fab} onPress={() => router.push('/product-edit')}>
        <Row style={{ gap: 6 }}>
          <Ionicons name="add" size={22} color="#fff" />
          <Txt color="#fff" style={{ fontFamily: Fonts.medium }}>
            Add product
          </Txt>
        </Row>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Shadow,
  },
});
