import { palette, typography } from '@/lib/theme';
import { StyleSheet, Text, type TextProps } from 'react-native';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = lightColor || palette.black;

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    ...typography.body,
    fontSize: 16,
  },
  defaultSemiBold: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    ...typography.title,
    fontSize: 32,
  },
  subtitle: {
    ...typography.title,
    fontSize: 24,
  },
  link: {
    ...typography.body,
    fontSize: 16,
    color: palette.black,
    textDecorationLine: 'underline',
  },
});

