// GateBasket design tokens. Change these to rebrand the whole app.
export const Brand = {
  name: 'GateBasket',
  tagline: 'Your community store, at your door',
};

export const Colors = {
  // Header / primary gradient, left → right.
  gradient: ['#F3537B', '#F96855'] as const,
  primary: '#F4505F',
  primaryDark: '#D93A4C',
  primarySoft: '#FFE7E7',
  accent: '#F8C33F',
  accentSoft: '#FFF4D9',
  blue: '#5CB1EA',
  blueSoft: '#E6F3FC',
  green: '#3DB46D',
  greenSoft: '#E3F4EA',
  background: '#F7EEEF',
  card: '#FFFFFF',
  text: '#33333A',
  textSecondary: '#6F6F78',
  textMuted: '#A3A3AB',
  border: '#EFE6E7',
  headerTextDim: 'rgba(255,255,255,0.75)',
  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  success: '#3DB46D',
  successSoft: '#E3F4EA',
} as const;

/** Bright circle colours for icon tiles, cycled through hub grids. */
export const IconTints = {
  red: ['#F65A5A', '#F4513E'],
  yellow: ['#FBC943', '#F2B12B'],
  green: ['#6CCB8F', '#45B26F'],
  blue: ['#6CBDF0', '#3E9FE0'],
  pink: ['#F7849A', '#F3537B'],
} as const;
export type IconTint = keyof typeof IconTints;

export const Fonts = {
  regular: 'Ubuntu_400Regular',
  medium: 'Ubuntu_500Medium',
  bold: 'Ubuntu_700Bold',
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
  sm: 4,
  md: 6,
  lg: 10,
  pill: 999,
} as const;

export const Shadow = {
  shadowColor: '#7A2A35',
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
} as const;
