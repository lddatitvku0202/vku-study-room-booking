import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { colors, spacing } from '@/data/theme';

import type { JSX } from 'react';

export interface EmptyStateProps {
  readonly title: string;
  readonly message?: string | undefined;
  /** A short glyph shown above the title, e.g. "📅". Decorative only. */
  readonly icon?: string | undefined;
  readonly actionLabel?: string | undefined;
  readonly onAction?: (() => void) | undefined;
}

const ICON_SIZE = 64;

/** Centred message for empty, error and "nothing here yet" states. */
export function EmptyState({
  title,
  message,
  icon,
  actionLabel,
  onAction,
}: EmptyStateProps): JSX.Element {
  return (
    <View style={styles.container}>
      {icon !== undefined && (
        <View style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
          <AppText style={styles.iconGlyph}>{icon}</AppText>
        </View>
      )}
      <AppText variant="heading" style={styles.centered}>
        {title}
      </AppText>
      {message !== undefined && (
        <AppText color="textSecondary" style={[styles.centered, styles.message]}>
          {message}
        </AppText>
      )}
      {actionLabel !== undefined && onAction !== undefined && (
        <View style={styles.action}>
          <AppButton label={actionLabel} onPress={onAction} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconGlyph: { fontSize: 28, lineHeight: 34 },
  centered: { textAlign: 'center' },
  message: { marginTop: spacing.sm, maxWidth: 320 },
  action: { marginTop: spacing.lg },
});
