import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { IconCircle, SectionHeader, Txt, type IconName } from '@/components/ui';
import { Colors, Radius, Shadow, Spacing, type IconTint } from '@/lib/theme';

type Tile = { label: string; icon: IconName; tint: IconTint; onPress?: () => void };

const SERVICES: Tile[] = [
  { label: 'Community Store', icon: 'storefront', tint: 'red', onPress: () => router.push('/store') },
  { label: 'Help Desk', icon: 'construct', tint: 'yellow' },
  { label: 'Notice Board', icon: 'clipboard', tint: 'blue' },
];

const DIRECTORIES: Tile[] = [
  { label: 'Local Daily Help', icon: 'people', tint: 'green' },
  { label: 'Visiting Help', icon: 'build', tint: 'blue' },
  { label: 'Residents', icon: 'id-card', tint: 'yellow' },
  { label: 'Emergency Nos', icon: 'medkit', tint: 'pink' },
];

function TileGrid({ tiles }: { tiles: Tile[] }) {
  return (
    <View style={styles.grid}>
      {tiles.map((t) => {
        const ready = !!t.onPress;
        return (
          <Pressable
            key={t.label}
            style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
            onPress={t.onPress ?? (() => Alert.alert(t.label, 'Coming soon to GateBasket.'))}>
            <IconCircle icon={t.icon} tint={t.tint} size={64} muted={!ready} />
            <Txt variant="heading" style={{ textAlign: 'center' }} color={ready ? Colors.text : Colors.textMuted}>
              {t.label}
            </Txt>
            {!ready && (
              <Txt variant="section" style={{ fontSize: 10 }}>
                Coming soon
              </Txt>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Apartment hub: services and directories as icon tiles. */
export default function ApartmentScreen() {
  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl }}>
      <TileGrid tiles={SERVICES} />
      <SectionHeader title="Directories" />
      <TileGrid tiles={DIRECTORIES} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.sm,
    ...Shadow,
  },
});
