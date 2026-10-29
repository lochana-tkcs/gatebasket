import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { BillRows } from '@/components/order-bits';
import { ProductImage, QtyStepper } from '@/components/product-card';
import { Button, Card, EmptyState, Row, Txt } from '@/components/ui';
import { useProfile } from '@/lib/auth';
import { cartSummary, useCart } from '@/lib/cart';
import { flatLabel, rupees } from '@/lib/format';
import { useMyStore } from '@/lib/queries';
import { errorMessage, supabase } from '@/lib/supabase';
import { Colors, Radius, Spacing } from '@/lib/theme';
import type { PaymentMode } from '@/lib/types';

export default function CartScreen() {
  const profile = useProfile();
  const store = useMyStore();
  const queryClient = useQueryClient();
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const clear = useCart((s) => s.clear);
  const cart = cartSummary(lines);

  const [note, setNote] = useState('');
  const [payment, setPayment] = useState<PaymentMode>('upi');
  const [placing, setPlacing] = useState(false);

  if (cart.count === 0) {
    return (
      <EmptyState icon="cart-outline" title="Your cart is empty" subtitle="Add items from your community store." />
    );
  }

  const deliveryFee = Number(store.data?.delivery_fee ?? 0);
  const minOrder = Number(store.data?.min_order ?? 0);
  const belowMin = cart.subtotal < minOrder;
  const closed = store.data ? !store.data.is_open : false;

  async function placeOrder() {
    setPlacing(true);
    const items = cart.list.map((l) => ({ product_id: l.product.id, qty: l.qty }));
    const { data, error } = await supabase.rpc('place_order', {
      p_items: items,
      p_payment_mode: payment,
      p_note: note,
    });
    setPlacing(false);
    if (error) {
      Alert.alert('Could not place order', errorMessage(error));
      // Stock may have changed; refresh the catalog.
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      return;
    }
    clear();
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['catalog'] });
    router.dismissTo('/');
    router.push(`/order/${data as string}`);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={{ gap: Spacing.xs }}>
          <Row style={{ gap: Spacing.sm }}>
            <Ionicons name="home" size={18} color={Colors.primary} />
            <Txt style={{ fontWeight: '700' }}>Deliver to {flatLabel(profile.flat)}</Txt>
          </Row>
          <Txt variant="caption">{profile.society?.name}</Txt>
        </Card>

        <Card style={{ gap: Spacing.md }}>
          {cart.list.map(({ product, qty }) => (
            <Row key={product.id} style={{ gap: Spacing.md }}>
              <ProductImage uri={product.image_url} size={44} />
              <View style={{ flex: 1 }}>
                <Txt numberOfLines={1} style={{ fontWeight: '600' }}>
                  {product.name}
                </Txt>
                <Txt variant="caption">{product.unit}</Txt>
              </View>
              <QtyStepper qty={qty} onChange={(q) => setQty(product, q)} max={product.stock_qty} />
              <Txt style={{ width: 60, textAlign: 'right', fontWeight: '600' }}>
                {rupees(Number(product.price) * qty)}
              </Txt>
            </Row>
          ))}
        </Card>

        <Card style={{ gap: Spacing.sm }}>
          <Txt variant="label">Note for the store</Txt>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Don't ring the bell, baby sleeping"
            placeholderTextColor={Colors.textMuted}
            style={styles.note}
            multiline
          />
        </Card>

        <Card style={{ gap: Spacing.sm }}>
          <Txt variant="label">Pay on delivery</Txt>
          <Row style={{ gap: Spacing.sm }}>
            {(['upi', 'cash'] as const).map((mode) => (
              <Button
                key={mode}
                title={mode === 'upi' ? 'UPI' : 'Cash'}
                icon={mode === 'upi' ? 'qr-code-outline' : 'cash-outline'}
                variant={payment === mode ? 'primary' : 'secondary'}
                onPress={() => setPayment(mode)}
                style={{ flex: 1 }}
              />
            ))}
          </Row>
        </Card>

        <Card>
          <BillRows order={{ subtotal: cart.subtotal, delivery_fee: deliveryFee, total: cart.subtotal + deliveryFee }} />
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        {closed && <Txt color={Colors.danger}>The store is closed right now.</Txt>}
        {!closed && belowMin && (
          <Txt color={Colors.danger}>Add {rupees(minOrder - cart.subtotal)} more to reach the minimum order.</Txt>
        )}
        <Button
          title={`Place order · ${rupees(cart.subtotal + deliveryFee)}`}
          onPress={placeOrder}
          loading={placing}
          disabled={closed || belowMin}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  note: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    fontSize: 15,
    color: Colors.text,
    textAlignVertical: 'top',
  },
  footer: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
