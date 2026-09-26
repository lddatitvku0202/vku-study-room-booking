import { useCallback, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, sizes, spacing } from '@/data/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

import type { ColorToken } from '@/data/theme';
import type { JSX } from 'react';

export type AppButtonVariant = 'primary' | 'secondary' | 'danger';

export interface AppButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: AppButtonVariant;
  readonly disabled?: boolean;
  /** Shows a spinner and blocks presses — use while an action is in flight. */
  readonly loading?: boolean;
}

const LABEL_COLOR: Readonly<Record<AppButtonVariant, ColorToken>> = {
  primary: 'surface',
  secondary: 'primary',
  danger: 'error',
};

const PRESSED_SCALE = 0.97;

/**
 * Tappable action with a guaranteed 44pt touch target. Shrinks slightly while
 * pressed (native driver, skipped when the OS asks to reduce motion).
 */
export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}: AppButtonProps): JSX.Element {
  const isInert = disabled || loading;
  const reduceMotion = useReduceMotion();
  const scale = useState(() => new Animated.Value(1))[0];

  const animateTo = useCallback(
    (toValue: number) => {
      if (reduceMotion) {
        return;
      }
      Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
    },
    [reduceMotion, scale],
  );
  const handlePressIn = useCallback(() => {
    animateTo(PRESSED_SCALE);
  }, [animateTo]);
  const handlePressOut = useCallback(() => {
    animateTo(1);
  }, [animateTo]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isInert, busy: loading }}
        disabled={isInert}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.base,
          variantStyles[variant],
          (pressed || loading) && pressedStyles[variant],
          disabled && !loading && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? colors.surface : colors.primary} />
        ) : (
          <AppText color={disabled ? 'surface' : LABEL_COLOR[variant]} style={styles.label}>
            {label}
          </AppText>
        )}
      </Pressable>
    </Animated.View>
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
  disabled: { backgroundColor: colors.disabled, borderColor: colors.disabled },
  label: { fontWeight: '600' },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  danger: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.error },
} satisfies Record<AppButtonVariant, object>);

const pressedStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primaryDark },
  secondary: { backgroundColor: colors.background },
  danger: { backgroundColor: colors.background },
} satisfies Record<AppButtonVariant, object>);
