import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, typography, type ColorToken, type TypographyToken } from '@/data/theme';

import type { JSX } from 'react';

export interface AppTextProps extends TextProps {
  /** Typography token. Defaults to `body`. */
  readonly variant?: TypographyToken;
  /** Colour token. Defaults to `text`. */
  readonly color?: ColorToken;
}

/** Text that only speaks in design tokens. */
export function AppText({
  variant = 'body',
  color = 'text',
  style,
  ...rest
}: AppTextProps): JSX.Element {
  return <Text {...rest} style={[variantStyles[variant], colorStyles[color], style]} />;
}

const variantStyles = StyleSheet.create({
  title: typography.title,
  heading: typography.heading,
  body: typography.body,
  caption: typography.caption,
});

const colorStyles = StyleSheet.create({
  primary: { color: colors.primary },
  primaryDark: { color: colors.primaryDark },
  background: { color: colors.background },
  surface: { color: colors.surface },
  text: { color: colors.text },
  textSecondary: { color: colors.textSecondary },
  border: { color: colors.border },
  success: { color: colors.success },
  warning: { color: colors.warning },
  error: { color: colors.error },
  disabled: { color: colors.disabled },
} satisfies Record<ColorToken, { color: string }>);
