import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ProductImage } from '@/components/product-card';
import { Button, Chip, Field, Loading, Row, Txt } from '@/components/ui';
import { useCatalog, useMyStore } from '@/lib/queries';
import { errorMessage, supabase } from '@/lib/supabase';
import { Colors, Fonts, Spacing } from '@/lib/theme';
import type { Category, Product } from '@/lib/types';

export default function ProductEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const store = useMyStore();
  const catalog = useCatalog(store.data?.id);

  if (store.isLoading || catalog.isLoading || !store.data || !catalog.data) return <Loading />;
  const existing = catalog.data.products.find((p) => p.id === id);
  return (
    <ProductForm
      key={existing?.id ?? 'new'}
      storeId={store.data.id}
      categories={catalog.data.categories}
      existing={existing}
    />
  );
}

function ProductForm({
  storeId,
  categories,
  existing,
}: {
  storeId: string;
  categories: Category[];
  existing: Product | undefined;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: existing?.name ?? '',
    unit: existing?.unit ?? '',
    price: existing ? String(Number(existing.price)) : '',
    mrp: existing?.mrp != null ? String(Number(existing.mrp)) : '',
    stock_qty: existing?.stock_qty != null ? String(existing.stock_qty) : '',
  });
  const [categoryId, setCategoryId] = useState<string | null>(existing?.category_id ?? null);
  const [inStock, setInStock] = useState(existing?.in_stock ?? true);
  const imageUrl = existing?.image_url ?? null;
  const [pickedImage, setPickedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled) setPickedImage(result.assets[0]);
  }

  async function uploadImage(asset: ImagePicker.ImagePickerAsset): Promise<string> {
    const ext = asset.mimeType?.split('/')[1] ?? 'jpg';
    const path = `${storeId}/${Date.now()}.${ext}`;
    const body = await (await fetch(asset.uri)).arrayBuffer();
    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, body, { contentType: asset.mimeType ?? 'image/jpeg' });
    if (error) throw error;
    return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  }

  async function save() {
    const price = Number(form.price);
    const mrp = form.mrp.trim() ? Number(form.mrp) : null;
    const stockQty = form.stock_qty.trim() ? parseInt(form.stock_qty, 10) : null;
    if (!form.name.trim() || Number.isNaN(price) || price < 0) {
      Alert.alert('Enter a product name and a valid price.');
      return;
    }
    if ((mrp != null && Number.isNaN(mrp)) || (stockQty != null && (Number.isNaN(stockQty) || stockQty < 0))) {
      Alert.alert('Check the MRP and stock quantity.');
      return;
    }

    setSaving(true);
    try {
      const image_url = pickedImage ? await uploadImage(pickedImage) : imageUrl;
      const values = {
        store_id: storeId,
        category_id: categoryId,
        name: form.name.trim(),
        unit: form.unit.trim() || null,
        price,
        mrp,
        stock_qty: stockQty,
        in_stock: inStock && stockQty !== 0,
        image_url,
      };
      const { error } = existing
        ? await supabase.from('products').update(values).eq('id', existing.id)
        : await supabase.from('products').insert(values);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      router.back();
    } catch (e) {
      Alert.alert('Could not save', errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Pressable onPress={pickImage} style={styles.imagePick}>
        <ProductImage uri={pickedImage?.uri ?? imageUrl} size={120} />
        <Row style={{ gap: 4 }}>
          <Ionicons name="camera-outline" size={16} color={Colors.primary} />
          <Txt color={Colors.primary} style={{ fontFamily: Fonts.medium }}>
            {pickedImage || imageUrl ? 'Change photo' : 'Add photo'}
          </Txt>
        </Row>
      </Pressable>

      <Field label="Product name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="Toned Milk" />
      <Field label="Pack size" value={form.unit} onChangeText={(unit) => setForm({ ...form, unit })} placeholder="500 ml" />
      <Row style={{ gap: Spacing.md }}>
        <View style={{ flex: 1 }}>
          <Field label="Selling price (₹)" value={form.price} onChangeText={(price) => setForm({ ...form, price })} keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="MRP (₹, optional)" value={form.mrp} onChangeText={(mrp) => setForm({ ...form, mrp })} keyboardType="decimal-pad" />
        </View>
      </Row>

      <Txt variant="label">Category</Txt>
      <View style={styles.chips}>
        {categories.map((c) => (
          <Chip key={c.id} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
        ))}
      </View>

      <Field
        label="Stock count (optional)"
        value={form.stock_qty}
        onChangeText={(stock_qty) => setForm({ ...form, stock_qty })}
        keyboardType="number-pad"
        placeholder="Leave empty if you don't count stock"
      />
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt style={{ fontFamily: Fonts.medium }}>In stock</Txt>
        <Switch value={inStock} onValueChange={setInStock} trackColor={{ true: Colors.primary }} />
      </Row>

      <Button title={existing ? 'Save product' : 'Add product'} onPress={save} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  imagePick: { alignItems: 'center', gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
