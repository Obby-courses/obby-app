// lib/theme.ts

export const colors = {
  background: '#ffffff',
  card: '#f8f8f8',
  textPrimary: '#111111',
  textSecondary: '#555555',
  mutedText: '#999999',
  accent: '#6D5DF6',
  primaryButton: '#000000',
  successBg: '#E6F7EC',
  successText: '#1E7F43',
  // ✅ AGGIUNTO: Colore per i bordi di input e card
  border: '#e1e1e1', 
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
}

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
}

export const layout = {
  screenPadding: 24,
  cardPadding: 24,
}

export const typography = {
  courseTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  small: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  backButton: {
    fontSize: 28,
    color: colors.textPrimary,
  },
}