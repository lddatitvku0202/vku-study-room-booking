import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, type ListRenderItem } from 'react-native';

import { FilterChipGroup } from '@/components/FilterChipGroup';
import { ROOM_CARD_HEIGHT, ROOM_ROW_HEIGHT, RoomCard } from '@/components/RoomCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { spacing } from '@/data/theme';
import { useRooms } from '@/hooks/use-rooms';
import { useDebounce } from '@/hooks/useDebounce';
import { getMockRoomStatus } from '@/utils/mock-room-status';
import { filterRooms, hasActiveFilters } from '@/utils/room-filters';

import type { MainTabScreenProps } from '@/navigation/types';
import type { Building, Equipment, Room, RoomStatus } from '@/types/room';
import type { JSX } from 'react';

/** Search waits this long after the last keystroke before filtering. */
export const SEARCH_DEBOUNCE_MS = 300;

const BUILDING_OPTIONS: readonly Building[] = ['A', 'B', 'C', 'V'];
const CAPACITY_OPTIONS: readonly number[] = [4, 6, 10, 15, 20];
const EQUIPMENT_OPTIONS: readonly Equipment[] = ['Projector', 'Whiteboard', 'High-spec PC', 'AC'];
const SKELETON_ROWS = [0, 1, 2, 3, 4] as const;
const NO_ROOMS: readonly Room[] = [];

// Module scope: FlatList receives the same functions on every render.
function keyExtractor(room: Room): string {
  return room.id;
}

// Every row has the same fixed height (see RoomCard), and there is no list
// header inside the FlatList, so row N starts exactly at N × ROOM_ROW_HEIGHT.
function getItemLayout(
  _data: ArrayLike<Room> | null | undefined,
  index: number,
): { length: number; offset: number; index: number } {
  return { length: ROOM_ROW_HEIGHT, offset: ROOM_ROW_HEIGHT * index, index };
}

function buildingLabel(building: Building): string {
  return building;
}

function capacityLabel(capacity: number): string {
  return `${capacity}+`;
}

function equipmentLabel(item: Equipment): string {
  return item;
}

function toggleInList<T>(list: readonly T[], item: T): readonly T[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

/**
 * Browse all rooms, with debounced search and AND-combined filters.
 *
 * Flow: TextInput → searchText → useDebounce(300 ms) → useMemo(filterRooms) → FlatList.
 * Rooms come from `useRooms()` (TanStack Query over the room repository) and are
 * never copied into state; only the filter criteria are local UI state.
 */
export function BrowseRoomsScreen({ navigation }: MainTabScreenProps<'BrowseRooms'>): JSX.Element {
  const { data: rooms, isPending, isError, refetch } = useRooms();

  const [searchText, setSearchText] = useState('');
  const [building, setBuilding] = useState<Building | undefined>(undefined);
  const [minimumCapacity, setMinimumCapacity] = useState<number | undefined>(undefined);
  const [equipment, setEquipment] = useState<readonly Equipment[]>([]);

  const debouncedSearch = useDebounce(searchText, SEARCH_DEBOUNCE_MS);
  const isSearchPending = searchText !== debouncedSearch;

  const allRooms = rooms ?? NO_ROOMS;

  // The only place filtering happens: once per change of data or criteria,
  // never inside renderItem or JSX. Uses the *debounced* search text.
  const filteredRooms = useMemo(
    () =>
      filterRooms(allRooms, {
        search: debouncedSearch,
        building,
        minimumCapacity,
        equipment,
      }),
    [allRooms, debouncedSearch, building, minimumCapacity, equipment],
  );

  const filtersActive = hasActiveFilters({
    search: searchText,
    building,
    minimumCapacity,
    equipment,
  });

  // Demo status, computed once per dataset rather than per row render.
  const statusById = useMemo(() => {
    const map = new Map<string, RoomStatus>();
    for (const room of allRooms) {
      map.set(room.id, getMockRoomStatus(room.id));
    }
    return map;
  }, [allRooms]);

  // Stable across renders (navigation is stable), so memoized cards stay memoized.
  const openRoom = useCallback(
    (roomId: string) => {
      navigation.navigate('RoomDetails', { roomId });
    },
    [navigation],
  );

  const renderItem = useCallback<ListRenderItem<Room>>(
    ({ item }) => (
      <RoomCard room={item} status={statusById.get(item.id) ?? 'available'} onPress={openRoom} />
    ),
    [statusById, openRoom],
  );

  const isBuildingSelected = useCallback((option: Building) => option === building, [building]);
  const toggleBuilding = useCallback((option: Building) => {
    setBuilding((current) => (current === option ? undefined : option));
  }, []);

  const isCapacitySelected = useCallback(
    (option: number) => option === minimumCapacity,
    [minimumCapacity],
  );
  const toggleCapacity = useCallback((option: number) => {
    setMinimumCapacity((current) => (current === option ? undefined : option));
  }, []);

  const isEquipmentSelected = useCallback(
    (option: Equipment) => equipment.includes(option),
    [equipment],
  );
  const toggleEquipment = useCallback((option: Equipment) => {
    setEquipment((current) => toggleInList(current, option));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchText('');
    setBuilding(undefined);
    setMinimumCapacity(undefined);
    setEquipment([]);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const summary = isSearchPending
    ? 'Searching…'
    : `${filteredRooms.length} of ${allRooms.length} rooms`;

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">Study Rooms</AppText>
        <AppText variant="caption" color="textSecondary">
          Demo data · status is a preview, not live occupancy
        </AppText>

        <AppInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search room name (e.g. B2)"
          accessibilityLabel="Search rooms by name"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={styles.search}
        />

        <FilterChipGroup
          title="Building"
          options={BUILDING_OPTIONS}
          getLabel={buildingLabel}
          isSelected={isBuildingSelected}
          onToggle={toggleBuilding}
        />
        <FilterChipGroup
          title="Capacity"
          options={CAPACITY_OPTIONS}
          getLabel={capacityLabel}
          isSelected={isCapacitySelected}
          onToggle={toggleCapacity}
        />
        <FilterChipGroup
          title="Equipment"
          options={EQUIPMENT_OPTIONS}
          getLabel={equipmentLabel}
          isSelected={isEquipmentSelected}
          onToggle={toggleEquipment}
        />

        <View style={styles.summaryRow}>
          <AppText variant="caption" color="textSecondary" accessibilityLiveRegion="polite">
            {rooms === undefined ? 'Loading rooms…' : summary}
          </AppText>
          {filtersActive && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search and filters"
              hitSlop={spacing.md}
              onPress={clearFilters}
            >
              <AppText variant="caption" color="primary" style={styles.clear}>
                Clear filters
              </AppText>
            </Pressable>
          )}
        </View>
      </View>

      {isPending ? (
        <View style={styles.list}>
          {SKELETON_ROWS.map((row) => (
            <View key={row} style={styles.skeletonRow}>
              <Skeleton width="100%" height={ROOM_CARD_HEIGHT} rounded="lg" />
            </View>
          ))}
        </View>
      ) : isError ? (
        <EmptyState
          title="Could not load rooms"
          message="Something went wrong while loading the room list."
          actionLabel="Try again"
          onAction={handleRetry}
        />
      ) : (
        <FlatList
          data={filteredRooms}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="No rooms match"
              message="Try a different name or fewer filters."
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  search: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  clear: {
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  skeletonRow: {
    height: ROOM_ROW_HEIGHT,
    paddingBottom: ROOM_ROW_HEIGHT - ROOM_CARD_HEIGHT,
  },
});
