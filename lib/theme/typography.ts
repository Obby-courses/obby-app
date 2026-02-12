import { palette } from './palette'

const baseFontFamily = {
  // Use system fonts for now, unless custom fonts are added
  regular: 'System',
  medium: 'System',
  bold: 'System', 
}

export const typeScale = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
}

export const typography = {
  courseTitle: {
    fontSize: typeScale.md,
    fontWeight: '700' as const, 
    lineHeight: 24,
  },
  title: {
    fontSize: typeScale['3xl'],
    fontWeight: '800' as const,
    letterSpacing: -1, // Tighter for large text
    color: palette.black,
  },
  header: {
    fontSize: typeScale.xl,
    fontWeight: '600' as const,
    color: palette.gray600,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: typeScale.lg,
    fontWeight: '400' as const,
    lineHeight: 28, // Better readability
    color: palette.gray800,
  },
  label: {
    fontSize: typeScale.sm,
    fontWeight: '500' as const,
    color: palette.gray500,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  small: {
    fontSize: typeScale.xs,
    color: palette.gray400,
  },
  backButton: {
    fontSize: 28, // Matches icon size probably
    color: palette.black,
  },
} as const
