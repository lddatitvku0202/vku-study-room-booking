import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/data/theme';

import type { JSX } from 'react';

export interface EmptyStateProps {
  readonly title: string;
  readonly message?: string | undefined;
  readonly actionLabel?: string | undefined;
  readonly onAction?: (() => void) | undefined;
}

/** Centred message for empty, error and "nothing here yet" states. */
export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps): JSX.Element {
  return (
    <View style={styles.container}>
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
  centered: { textAlign: 'center' },
  message: { marginTop: spacing.sm },
  action: { marginTop: spacing.lg },
});
