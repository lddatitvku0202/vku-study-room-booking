import { memo, useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, sizes, spacing } from '@/data/theme';

export interface DateChipProps {
  /** `yyyy-MM-dd`. */
  readonly dateKey: string;
  readonly weekday: string;
  readonly isToday: boolean;
  readonly selected: boolean;
  readonly onSelect: (dateKey: string) => void;
}

/** One selectable day in the 7-day date strip. */
export const DateChip = memo(function DateChip({
  dateKey,
  weekday,
  isToday,
  selected,
  onSelect,
}: DateChipProps) {
  const handlePress = useCallback(() => {
    onSelect(dateKey);
  }, [onSelect, dateKey]);
  const dayLabel = isToday ? 'Today' : weekday;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${dayLabel}, ${dateKey}`}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        pressed && !selected && styles.pressed,
      ]}
    >
      <AppText variant="caption" color={selected ? 'surface' : 'textSecondary'}>
        {dayLabel}
      </AppText>
      <AppText variant="body" color={selected ? 'surface' : 'text'} style={styles.date}>
        {dateKey}
      </AppText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  chip: {
    minHeight: sizes.touchTarget + spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
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
  date: {
    fontWeight: '600',
  },
});
