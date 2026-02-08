import { palette } from '@/lib/theme';
import { View, type ViewProps } from 'react-native';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const backgroundColor = lightColor || palette.white;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}

