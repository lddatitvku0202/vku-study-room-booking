import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/data/theme';

import type { JSX } from 'react';

export type BadgeTone = 'success' | 'error' | 'primary' | 'neutral';

export interface BadgeProps {
  readonly label: string;
  readonly tone?: BadgeTone;
}

/** Small status pill. Solid tones use white text, which clears WCAG AA on each. */
export function Badge({ label, tone = 'neutral' }: BadgeProps): JSX.Element {
  return (
    <View style={[styles.base, toneStyles[tone]]}>
      <AppText
        variant="caption"
        color={tone === 'neutral' ? 'textSecondary' : 'surface'}
        numberOfLines={1}
        style={styles.label}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radius.sm,
  },
  label: { fontWeight: '600' },
});

const toneStyles = StyleSheet.create({
  success: { backgroundColor: colors.success },
  error: { backgroundColor: colors.error },
  primary: { backgroundColor: colors.primary },
  neutral: { backgroundColor: colors.border },
} satisfies Record<BadgeTone, { backgroundColor: string }>);
