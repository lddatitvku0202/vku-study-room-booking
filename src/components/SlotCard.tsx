import { memo, useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, sizes, spacing } from '@/data/theme';

import type { ColorToken } from '@/data/theme';
import type { SlotId } from '@/data/time-slots';

/**
 * - `available`  — can be picked
 * - `selected`   — the user's current pick
 * - `past`       — the slot has already started today
 * - `booked`     — a confirmed booking on this device already holds it
 * - `conflicted` — the demo simulator reported a conflict for it this session
 */
export type SlotCardState = 'available' | 'selected' | 'past' | 'booked' | 'conflicted';

const STATE_CAPTION: Readonly<Record<SlotCardState, string>> = {
  available: 'Available',
  selected: 'Selected',
  past: 'Past',
  booked: 'Booked',
  conflicted: 'Unavailable',
};

const CAPTION_COLOR: Readonly<Record<SlotCardState, ColorToken>> = {
  available: 'success',
  selected: 'surface',
  past: 'disabled',
  booked: 'primary',
  conflicted: 'error',
};

const DISABLED_STATES: ReadonlySet<SlotCardState> = new Set(['past', 'booked', 'conflicted']);

export interface SlotCardProps {
  readonly slotId: SlotId;
  readonly label: string;
  readonly state: SlotCardState;
  readonly onSelect: (slotId: SlotId) => void;
}

/** One of the four fixed time slots. Users can only pick, never type, a time. */
export const SlotCard = memo(function SlotCard({ slotId, label, state, onSelect }: SlotCardProps) {
  const isSelected = state === 'selected';
  const isDisabled = DISABLED_STATES.has(state);
  const handlePress = useCallback(() => {
    onSelect(slotId);
  }, [onSelect, slotId]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled: isDisabled }}
      accessibilityLabel={`${label}, ${STATE_CAPTION[state]}`}
      disabled={isDisabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        isSelected && styles.selected,
        isDisabled && styles.disabled,
        pressed && !isSelected && styles.pressed,
      ]}
    >
      <AppText
        variant="heading"
        color={isSelected ? 'surface' : isDisabled ? 'disabled' : 'text'}
        numberOfLines={1}
      >
        {label}
      </AppText>
      <AppText variant="caption" color={CAPTION_COLOR[state]} style={styles.caption}>
        {STATE_CAPTION[state]}
      </AppText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: sizes.touchTarget + spacing.lg,
    paddingHorizontal: spacing.sm,
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
  disabled: {
    backgroundColor: colors.background,
  },
  pressed: {
    backgroundColor: colors.background,
  },
  caption: {
    fontWeight: '600',
  },
});
