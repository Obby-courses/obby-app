export const spacing = {
  xs: 6,
  sm: 10,
  md: 20,
  lg: 30,
  xl: 40,
  '2xl': 60,
  '3xl': 100,
} as const

export const radius = {
  sm: 12,
  md: 24,
  lg: 999, // Pill style
  xl: 32, // For larger containers
} as const

export const layout = {
  screenPadding: 20,
  cardPadding: 20,
  maxContentWidth: 1200, // For potential web layouts
} as const
