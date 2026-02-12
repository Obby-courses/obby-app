/**
 * Updated theme constants to use the modular theme system from @/lib/theme.
 * This ensures consistency across the app.
 */

import { colors, palette } from '@/lib/theme';

const tintColorLight = colors.primary;
const tintColorDark = palette.white;

export const Colors = {
  light: {
    text: colors.textPrimary,
    background: colors.background,
    tint: tintColorLight,
    icon: colors.textSecondary,
    tabIconDefault: colors.mutedText,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: palette.white,
    background: palette.black,
    tint: tintColorDark,
    icon: palette.gray400,
    tabIconDefault: palette.gray600,
    tabIconSelected: tintColorDark,
  },
};

// Re-export Fonts (kept for compatibility, though we prefer lib/theme/typography)
import { Platform } from 'react-native';

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
