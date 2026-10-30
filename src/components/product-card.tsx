import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { rupees } from '@/lib/format';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/lib/theme';
import type { Product } from '@/lib/types';

import { Gradient, Txt } from './ui';

export function QtyStepper({ qty, onChange, max }: { qty: number; onChange: (qty: number) => void; max?: number | null }) {
  if (qty === 0) {
    return (
      <Pressable onPress={() => onChange(1)} style={styles.add}>
        <Text style={styles.addText}>ADD</Text>
      </Pressable>
    );
  }
  const atMax = max != null && qty >= max;
  return (
    <Gradient style={styles.stepper}>
      <Pressable hitSlop={8} onPress={() => onChange(qty - 1)}>
        <Ionicons name="remove" size={18} color="#fff" />
      </Pressable>
      <Text style={styles.stepperQty}>{qty}</Text>
      <Pressable hitSlop={8} disabled={atMax} onPress={() => onChange(qty + 1)} style={atMax && { opacity: 0.4 }}>
        <Ionicons name="add" size={18} color="#fff" />
      </Pressable>
    </Gradient>
  );
}

export function ProductImage({ uri, size }: { uri: string | null; size: number }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: Radius.sm }} contentFit="cover" />;
  }
  return (
    <View style={[styles.placeholder, { width: size, height: size }]}>
      <Ionicons name="basket-outline" size={size * 0.45} color={Colors.primary} />
    </View>
  );
}

export function ProductCard({
  product,
  qty,
  onChangeQty,
}: {
  product: Product;
  qty: number;
  onChangeQty: (qty: number) => void;
}) {
  const discount = product.mrp && product.mrp > product.price ? Math.round((1 - product.price / product.mrp) * 100) : 0;
  return (
    <View style={[styles.card, !product.in_stock && { opacity: 0.5 }]}>
      <View style={styles.imageWrap}>
        <ProductImage uri={product.image_url} size={96} />
        {discount > 0 && (
          <View style={styles.discount}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}
      </View>
      <Txt numberOfLines={2} style={styles.name}>
        {product.name}
      </Txt>
      <Txt variant="caption">{product.unit}</Txt>
      <View style={styles.footer}>
        <View>
          <Text style={styles.price}>{rupees(product.price)}</Text>
          {discount > 0 && <Text style={styles.mrp}>{rupees(product.mrp)}</Text>}
        </View>
        {product.in_stock ? (
          <QtyStepper qty={qty} onChange={onChangeQty} max={product.stock_qty} />
        ) : (
          <Txt variant="caption" color={Colors.danger}>
            Out of stock
          </Txt>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
    ...Shadow,
  },
  imageWrap: { alignItems: 'center', marginBottom: Spacing.xs },
  placeholder: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discount: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: Colors.blue,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: { color: '#fff', fontSize: 10, fontFamily: Fonts.bold },
  name: { fontFamily: Fonts.medium, minHeight: 40 },
  footer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto' },
  price: { fontSize: 16, fontFamily: Fonts.medium, color: Colors.text },
  mrp: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, textDecorationLine: 'line-through' },
  add: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    backgroundColor: Colors.primarySoft,
  },
  addText: { color: Colors.primary, fontFamily: Fonts.bold, fontSize: 13, letterSpacing: 1 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  stepperQty: { color: '#fff', fontFamily: Fonts.bold, minWidth: 16, textAlign: 'center' },
});
