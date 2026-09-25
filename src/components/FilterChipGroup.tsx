import { useCallback } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItem } from 'react-native';

import { FilterChip } from '@/components/FilterChip';
import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/data/theme';

import type { JSX } from 'react';

export interface FilterChipGroupProps<T extends string | number> {
  readonly title: string;
  readonly options: readonly T[];
  readonly getLabel: (option: T) => string;
  readonly isSelected: (option: T) => boolean;
  readonly onToggle: (option: T) => void;
}

function keyOf(option: string | number): string {
  return String(option);
}

/**
 * One labelled row of filter chips, scrollable horizontally.
 *
 * Generic over the option type (building, capacity, equipment), so each group
 * stays fully typed without casts. `extraData={isSelected}` re-renders the row
 * when the selection changes, since the options array itself never changes.
 */
export function FilterChipGroup<T extends string | number>({
  title,
  options,
  getLabel,
  isSelected,
  onToggle,
}: FilterChipGroupProps<T>): JSX.Element {
  const renderItem = useCallback<ListRenderItem<T>>(
    ({ item }) => (
      <FilterChip
        label={getLabel(item)}
        selected={isSelected(item)}
        onPress={() => {
          onToggle(item);
        }}
      />
    ),
    [getLabel, isSelected, onToggle],
  );

  return (
    <View style={styles.group}>
      <AppText variant="caption" color="textSecondary" style={styles.title}>
        {title}
      </AppText>
      <FlatList
        horizontal
        data={options}
        renderItem={renderItem}
        keyExtractor={keyOf}
        extraData={isSelected}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chips}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    width: 72,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  chips: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
