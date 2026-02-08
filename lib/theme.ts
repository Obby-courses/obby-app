// lib/theme.ts

export const palette = {
    yellow: '#E2F13E',
    green: '#A8E6CF',
    purple: '#B2B2FF',
    blue: '#B2EBF2',
    pink: '#FFCCE5',
    peach: '#FFE5CC',
    cyan: '#B2FFFF',
    white: '#ffffff',
    black: '#000000',
    gray: '#999999',
    lightGray: '#f8f8f8',
    border: '#eeeeee',
}

export const colors = {
  background: palette.white,
  card: palette.lightGray,
  textPrimary: palette.black,
  textSecondary: '#333333',
  mutedText: palette.gray,
  accent: palette.black,
  primaryButton: palette.black,
  successBg: '#E6F7EC',
  successText: '#1E7F43',
  border: palette.border,
}

export const spacing = {
  xs: 6,
  sm: 10,
  md: 20,
  lg: 30,
  xl: 40,
}

export const radius = {
  sm: 12,
  md: 24,
  lg: 999, // Pill style
}

export const layout = {
  screenPadding: 20,
  cardPadding: 20,
}

export const typography = {
  courseTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  title: {
    fontSize: 32,
    fontWeight: '800' as const,
  },
  header: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: palette.gray,
  },
  body: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: palette.gray,
  },
  small: {
    fontSize: 14,
  },
  backButton: {
    fontSize: 28,
  },
}
