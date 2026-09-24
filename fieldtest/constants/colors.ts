/**
 * FieldTest Design System — Color Tokens
 *
 * Visual language: government/field operations software.
 * Deep navy, white, slate. No neon gradients or AI startup aesthetics.
 */

export const Colors = {
  // Core
  background: '#F7F9FC',
  surface: '#FFFFFF',
  primary: '#172033',
  primaryLight: '#E8ECF4',
  secondary: '#526071',

  // Accent
  accent: '#2457D6',
  accentLight: '#EBF0FB',

  // Semantic
  success: '#16835B',
  successLight: '#E6F5EF',
  warning: '#B7791F',
  warningLight: '#FFF8E6',
  danger: '#C53030',
  dangerLight: '#FEE8E8',

  // Neutral
  border: '#DCE2EA',
  borderLight: '#EEF1F5',
  borderDark: '#A8B3C2',
  text: '#172033',
  textPrimary: '#172033',
  textSecondary: '#526071',
  textTertiary: '#8A95A3',
  textInverse: '#FFFFFF',

  // Status-specific
  verified: '#16835B',
  failed: '#C53030',
  inconclusive: '#B7791F',
  pending: '#526071',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const BorderRadius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Shadow = {
  sm: {
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
