import { Ionicons } from '@expo/vector-icons';
import type { Tabs } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts, Spacing } from '@/lib/theme';

import { Gradient, type IconName } from './ui';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

type HeaderAction = { icon: IconName; onPress: () => void; label: string };

/**
 * Gradient header with a title row and text tabs underneath, used as the tab bar
 * (with tabBarPosition: 'top') for the resident and store sections.
 */
export function HeaderTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  title,
  left,
  right,
}: TabBarProps & { title: ReactNode; left?: HeaderAction; right?: HeaderAction }) {
  const insets = useSafeAreaInsets();
  return (
    <Gradient style={{ paddingTop: insets.top }}>
      {/* Faint building silhouette behind the title. */}
      <Ionicons name="business" size={150} color="rgba(255,255,255,0.08)" style={styles.watermark} />

      <View style={styles.titleRow}>
        <HeaderButton action={left} />
        <View style={styles.title}>{title}</View>
        <HeaderButton action={right} />
      </View>

      <View style={styles.tabs}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = options.title ?? route.name;
          const badge = options.tabBarBadge;
          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };
          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: focused }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={[styles.tabText, focused && styles.tabTextActive]}>{label}</Text>
                {badge != null && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.underline, focused && styles.underlineActive]} />
            </Pressable>
          );
        })}
      </View>
    </Gradient>
  );
}

function HeaderButton({ action }: { action?: HeaderAction }) {
  if (!action) return <View style={styles.headerButton} />;
  return (
    <Pressable onPress={action.onPress} hitSlop={10} style={styles.headerButton} accessibilityLabel={action.label}>
      <Ionicons name={action.icon} size={25} color="#fff" />
    </Pressable>
  );
}

/** White header title text, with an optional dim subtitle. */
export function HeaderTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text numberOfLines={1} style={styles.titleText}>
        {title}
      </Text>
      {subtitle ? (
        <Text numberOfLines={1} style={styles.subtitleText}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  watermark: { position: 'absolute', right: -10, bottom: -6 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  headerButton: { width: 32, alignItems: 'center' },
  title: { flex: 1, alignItems: 'center' },
  titleText: { fontFamily: Fonts.regular, fontSize: 20, color: '#fff' },
  subtitleText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.headerTextDim, marginTop: 2 },
  tabs: { flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', paddingTop: Spacing.sm },
  tabText: { fontFamily: Fonts.regular, fontSize: 16, color: Colors.headerTextDim, paddingBottom: Spacing.md },
  tabTextActive: { fontFamily: Fonts.bold, color: '#fff' },
  underline: { height: 3, alignSelf: 'stretch', marginHorizontal: Spacing.lg, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  underlineActive: { backgroundColor: '#fff' },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginBottom: Spacing.md,
  },
  badgeText: { fontFamily: Fonts.bold, fontSize: 11, color: Colors.primary },
});
