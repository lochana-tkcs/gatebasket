import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ColorValue,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Colors, Radius, Shadow, Spacing } from '@/lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type TxtVariant = 'title' | 'heading' | 'body' | 'label' | 'caption';

export function Txt({
  variant = 'body',
  color,
  style,
  children,
  numberOfLines,
}: {
  variant?: TxtVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
}) {
  return (
    <Text numberOfLines={numberOfLines} style={[textStyles[variant], color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

const textStyles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  heading: { fontSize: 17, fontWeight: '700', color: Colors.text },
  body: { fontSize: 15, color: Colors.text },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  caption: { fontSize: 12, color: Colors.textMuted },
});

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = buttonVariants[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && { opacity: 0.8 },
        inactive && { opacity: 0.5 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={v.fg} />}
          <Text style={[styles.buttonText, { color: v.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const buttonVariants = {
  primary: { bg: Colors.primary, fg: '#fff', border: Colors.primary },
  secondary: { bg: Colors.card, fg: Colors.primary, border: Colors.primary },
  danger: { bg: Colors.card, fg: Colors.danger, border: Colors.danger },
  ghost: { bg: 'transparent', fg: Colors.textSecondary, border: 'transparent' },
};

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: Spacing.xs }}>
      <Txt variant="label">{label}</Txt>
      <TextInput placeholderTextColor={Colors.textMuted} style={[styles.input, style]} {...props} />
    </View>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: IconName; title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={48} color={Colors.textMuted} />
      <Txt variant="heading">{title}</Txt>
      {subtitle && (
        <Txt color={Colors.textSecondary} style={{ textAlign: 'center' }}>
          {subtitle}
        </Txt>
      )}
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  );
}

export function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  buttonText: { fontSize: 15, fontWeight: '700' },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextSelected: { color: '#fff' },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: Colors.text,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.xxl },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
});

/** Tab bar icon renderer for Tabs.Screen options. */
export function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color as string} />;
  };
}
