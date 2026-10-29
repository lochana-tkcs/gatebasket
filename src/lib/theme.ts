// GateBasket brand. Change these to rebrand the whole app.
export const Brand = {
  name: 'GateBasket',
  tagline: 'Your community store, at your door',
};

export const Colors = {
  primary: '#0F9D8A',
  primaryDark: '#0B7A6B',
  primarySoft: '#E3F5F2',
  accent: '#F5A623',
  accentSoft: '#FEF3E0',
  background: '#F4F6F8',
  card: '#FFFFFF',
  text: '#1A1D21',
  textSecondary: '#5F6670',
  textMuted: '#9AA1AB',
  border: '#E4E7EB',
  danger: '#D93F3F',
  dangerSoft: '#FDECEC',
  success: '#2E9E5B',
  successSoft: '#E6F6EC',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const Shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
} as const;
