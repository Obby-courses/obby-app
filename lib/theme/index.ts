import { layout, radius, spacing } from './layout'
import { palette } from './palette'
import { typography } from './typography'

// Re-export specific modules for direct access if needed
export { componentStyles, icons } from './icons'
export { layout, radius, spacing } from './layout'
export { palette } from './palette'
export { typography } from './typography'

// Define Semantic Colors
export const colors = {
  // Backgrounds
  background: palette.white,
  card: palette.gray50,
  cardHover: palette.gray100,
  modalOverlay: 'rgba(0, 0, 0, 0.5)',
  
  // Text Colors
  textPrimary: palette.gray900,
  textSecondary: palette.gray600,
  mutedText: palette.gray400,
  inverseText: palette.white,
  
  // Brand / Actions
  primary: palette.black,
  secondary: palette.gray200,
  accent: palette.black,
  
  // Feedback
  successBg: palette.green, // Light green for bg perhaps? Or just green text. Old theme used specialized hex.
  successText: '#15803d', // specific shade for text readability
  errorText: palette.error,
  warningText: palette.warning,
  
  // UI Elements
  border: palette.gray200,
  divider: palette.gray100,
  
  // Button Specifics
  primaryButton: palette.black,
  primaryButtonText: palette.white,
  secondaryButton: palette.white,
  secondaryButtonText: palette.black,
  secondaryButtonBorder: palette.gray300,
} as const

// Default export for convenience
export default {
  colors,
  spacing,
  radius,
  layout,
  typography,
  palette, 
}
