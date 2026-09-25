import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, sizes, spacing } from '@/data/theme';

import type { JSX } from 'react';

export interface AppButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: 'primary' | 'secondary';
  readonly disabled?: boolean;
}

/** Tappable action with a guaranteed 44pt touch target. */
export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: AppButtonProps): JSX.Element {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && (isPrimary ? styles.primaryPressed : styles.secondaryPressed),
        disabled && styles.disabled,
      ]}
    >
      <AppText color={isPrimary ? 'surface' : 'primary'} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: sizes.touchTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.primary },
  primaryPressed: { backgroundColor: colors.primaryDark },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryPressed: { backgroundColor: colors.background },
  disabled: { backgroundColor: colors.disabled, borderColor: colors.disabled },
  label: { fontWeight: '600' },
});
