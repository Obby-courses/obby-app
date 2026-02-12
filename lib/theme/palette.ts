export const palette = {
  // Base Colors - Monochrome
  white: '#FFFFFF',
  black: '#000000',
  
  // Grays for depth and hierarchy - Minimalist scale
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  
  // Course Colors - Only used for differentiation
  yellow: '#E2F13E',
  green: '#A8E6CF',
  purple: '#B2B2FF',
  blue: '#B2EBF2',
  pink: '#FFCCE5',
  peach: '#FFE5CC',
  cyan: '#B2FFFF',
  
  // Semantic Colors
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',

  // Legacy Aliases
  gray: '#9CA3AF', // Matches gray400
  lightGray: '#F3F4F6', // Matches gray100
  border: '#E5E7EB', // Matches gray200
} as const
