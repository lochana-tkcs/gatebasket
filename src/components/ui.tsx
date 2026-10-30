import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

import { Colors, Fonts, IconTints, Radius, Shadow, Spacing, type IconTint } from '@/lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type TxtVariant = 'title' | 'heading' | 'body' | 'label' | 'caption' | 'section';

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
  title: { fontFamily: Fonts.medium, fontSize: 22, color: Colors.text },
  heading: { fontFamily: Fonts.regular, fontSize: 18, color: Colors.text },
  body: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.text },
  label: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.textSecondary },
  caption: { fontFamily: Fonts.regular, fontSize: 12.5, color: Colors.textMuted },
  // Uppercase, letter-spaced section headings ("MY ORDERS").
  section: { fontFamily: Fonts.medium, fontSize: 13, letterSpacing: 1.4, color: Colors.textMuted, textTransform: 'uppercase' },
});

export function Gradient({ style, children }: { style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  return (
    <LinearGradient colors={Colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={style}>
      {children}
    </LinearGradient>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Uppercase section heading with an optional red action on the right ("+ ADD"). */
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Txt variant="section">{title}</Txt>
      {action && (
        <Pressable hitSlop={8} onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
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
  const inactive = disabled || loading;
  const fg = variant === 'primary' ? '#fff' : variant === 'danger' ? Colors.danger : variant === 'ghost' ? Colors.textSecondary : Colors.primary;
  const content = loading ? (
    <ActivityIndicator color={fg} />
  ) : (
    <>
      {icon && <Ionicons name={icon} size={18} color={fg} />}
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [pressed && { opacity: 0.85 }, inactive && { opacity: 0.5 }, style]}>
      {variant === 'primary' ? (
        <Gradient style={styles.button}>{content}</Gradient>
      ) : (
        <View
          style={[
            styles.button,
            variant === 'secondary' && { backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.primary },
            variant === 'danger' && { backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.danger },
          ]}>
          {content}
        </View>
      )}
    </Pressable>
  );
}

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
      <Txt variant="section" style={{ fontSize: 12 }}>
        {label}
      </Txt>
      <TextInput placeholderTextColor={Colors.textMuted} style={[styles.input, style]} {...props} />
    </View>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: IconName; title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <IconCircle icon={icon} tint="pink" size={72} />
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

/** Small uppercase status pill ("ALLOWED", "INSIDE"). */
export function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

/** Bright gradient circle with a white icon, used for tiles and avatars. */
export function IconCircle({
  icon,
  tint = 'red',
  size = 48,
  muted,
}: {
  icon: IconName;
  tint?: IconTint;
  size?: number;
  muted?: boolean;
}) {
  const colors = muted ? (['#E4DCDD', '#D6CDCE'] as const) : IconTints[tint];
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={size * 0.48} color="#fff" />
    </LinearGradient>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

/** Icon + text line inside a card ("12 items • ₹240"). */
export function MetaRow({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <Row style={{ gap: Spacing.sm }}>
      <Ionicons name={icon} size={16} color={Colors.textMuted} />
      <Txt color={Colors.textSecondary} style={{ flex: 1 }} numberOfLines={1}>
        {children}
      </Txt>
    </Row>
  );
}

/** Split action bar at the bottom of a card ("Check RSVPs | Edit"). */
export function CardActions({
  actions,
}: {
  actions: { label: string; icon?: IconName; onPress: () => void; tone?: 'primary' | 'danger' | 'default' }[];
}) {
  return (
    <View style={styles.cardActions}>
      {actions.map((a, i) => {
        const color = a.tone === 'primary' ? Colors.primary : a.tone === 'danger' ? Colors.danger : Colors.textSecondary;
        return (
          <Pressable
            key={a.label}
            onPress={a.onPress}
            style={({ pressed }) => [styles.cardAction, i > 0 && styles.cardActionDivider, pressed && { backgroundColor: Colors.background }]}>
            {a.icon && <Ionicons name={a.icon} size={17} color={color} />}
            <Text style={[styles.cardActionText, { color }]}>{a.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Tab bar icon renderer for Tabs.Screen options. */
export function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color as string} />;
  };
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    ...Shadow,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  sectionAction: { fontFamily: Fonts.bold, fontSize: 14, letterSpacing: 1, color: Colors.primary },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    minHeight: 50,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
  },
  buttonText: { fontFamily: Fonts.medium, fontSize: 16 },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.textSecondary },
  chipTextSelected: { color: '#fff' },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.text,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xxl },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill, alignSelf: 'flex-start' },
  pillText: { fontFamily: Fonts.bold, fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase' },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginHorizontal: -Spacing.lg,
    marginBottom: -Spacing.lg,
    marginTop: Spacing.sm,
  },
  cardAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
  },
  cardActionDivider: { borderLeftWidth: 1, borderLeftColor: Colors.border },
  cardActionText: { fontFamily: Fonts.regular, fontSize: 15 },
});
