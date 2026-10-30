import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Button, Card, EmptyState, Field, Loading, Row, Txt } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useMyStore } from '@/lib/queries';
import { errorMessage, supabase } from '@/lib/supabase';
import { Colors, Fonts, Spacing } from '@/lib/theme';
import type { Store } from '@/lib/types';

export default function StoreSettingsScreen() {
  const store = useMyStore();
  if (store.isLoading) return <Loading />;
  if (!store.data) return <EmptyState icon="storefront-outline" title="No store linked" />;
  // Keyed so the form starts from the saved values for this store.
  return <StoreSettingsForm key={store.data.id} store={store.data} />;
}

function StoreSettingsForm({ store: s }: { store: Store }) {
  const { profile, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: s.name,
    opening_hours: s.opening_hours,
    min_order: String(Number(s.min_order)),
    delivery_fee: String(Number(s.delivery_fee)),
  });
  const [saving, setSaving] = useState(false);

  async function update(values: Partial<Store>) {
    const { error } = await supabase.from('stores').update(values).eq('id', s.id);
    if (error) Alert.alert('Could not save', errorMessage(error));
    queryClient.invalidateQueries({ queryKey: ['store'] });
    return !error;
  }

  async function save() {
    const minOrder = Number(form.min_order);
    const fee = Number(form.delivery_fee);
    if (!form.name.trim() || Number.isNaN(minOrder) || Number.isNaN(fee) || minOrder < 0 || fee < 0) {
      Alert.alert('Check the store name, minimum order and delivery fee.');
      return;
    }
    setSaving(true);
    const ok = await update({ name: form.name.trim(), opening_hours: form.opening_hours.trim(), min_order: minOrder, delivery_fee: fee });
    setSaving(false);
    if (ok) Alert.alert('Saved');
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Card style={[styles.openCard, { backgroundColor: s.is_open ? Colors.successSoft : Colors.dangerSoft }]}>
        <View style={{ flex: 1 }}>
          <Txt variant="heading" color={s.is_open ? Colors.success : Colors.danger}>
            {s.is_open ? 'Store is OPEN' : 'Store is CLOSED'}
          </Txt>
          <Txt color={Colors.textSecondary}>
            {s.is_open ? 'Residents can place orders.' : 'Residents can browse but not order.'}
          </Txt>
        </View>
        <Switch value={s.is_open} onValueChange={(v) => void update({ is_open: v })} trackColor={{ true: Colors.success }} />
      </Card>

      <Card style={{ gap: Spacing.lg }}>
        <Field label="Store name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
        <Field
          label="Opening hours"
          value={form.opening_hours}
          onChangeText={(opening_hours) => setForm({ ...form, opening_hours })}
          placeholder="7:00 AM – 10:00 PM"
        />
        <Row style={{ gap: Spacing.md }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Minimum order (₹)"
              value={form.min_order}
              onChangeText={(min_order) => setForm({ ...form, min_order })}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Delivery fee (₹)"
              value={form.delivery_fee}
              onChangeText={(delivery_fee) => setForm({ ...form, delivery_fee })}
              keyboardType="decimal-pad"
            />
          </View>
        </Row>
        <Button title="Save changes" onPress={save} loading={saving} />
      </Card>

      <Card style={{ gap: 2 }}>
        <Txt variant="caption">Signed in as</Txt>
        <Txt style={{ fontFamily: Fonts.medium }}>{profile?.phone ? `+${profile.phone}` : profile?.name}</Txt>
      </Card>
      <Button title="Sign out" variant="danger" icon="log-out-outline" onPress={signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.lg, gap: Spacing.lg },
  openCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
