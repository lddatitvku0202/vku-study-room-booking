import { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, sizes, spacing } from '@/data/theme';

export interface FilterChipProps {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly disabled?: boolean;
}

const CHIP_HEIGHT = 36;
// Extends the tappable area to the 44pt accessibility minimum.
const HIT_SLOP = (sizes.touchTarget - CHIP_HEIGHT) / 2;

/** Toggleable pill used for filters and quick selections. */
export const FilterChip = memo(function FilterChip({
  label,
  selected,
  onPress,
  disabled = false,
}: FilterChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        pressed && !selected && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <AppText
        variant="caption"
        color={selected ? 'surface' : disabled ? 'disabled' : 'text'}
        numberOfLines={1}
        style={styles.label}
      >
        {label}
      </AppText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  chip: {
    height: CHIP_HEIGHT,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pressed: {
    backgroundColor: colors.background,
  },
  disabled: {
    backgroundColor: colors.background,
  },
  label: {
    fontWeight: '600',
  },
});
