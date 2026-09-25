import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius, spacing } from '@/data/theme';

import type { JSX } from 'react';

/** Raised surface container. */
export function Card({ style, ...rest }: ViewProps): JSX.Element {
  return <View {...rest} style={[styles.card, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
});
