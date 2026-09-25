import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItem } from 'react-native';

import { ROOM_CARD_HEIGHT, ROOM_ROW_HEIGHT, RoomCard } from '@/components/RoomCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { spacing } from '@/data/theme';
import { useRooms } from '@/hooks/use-rooms';
import { getMockRoomStatus } from '@/utils/mock-room-status';

import type { Building, Room, RoomStatus } from '@/types/room';
import type { JSX } from 'react';

const BUILDING_CHIPS: readonly Building[] = ['A', 'B', 'C', 'V'];
const SKELETON_ROWS = [0, 1, 2, 3, 4] as const;

// Defined at module scope so FlatList receives the same function every render.
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

/**
 * Browse all rooms.
 *
 * Rooms come from `useRooms()` — TanStack Query over the room repository — and
 * are never copied into client state. Search and filters are placeholders here;
 * they are wired up in MVP-02.
 */
export function BrowseRoomsScreen(): JSX.Element {
  const { data: rooms, isPending, isError, refetch } = useRooms();

  // Computed once per dataset, not per row render.
  const statusById = useMemo(() => {
    const map = new Map<string, RoomStatus>();
    for (const room of rooms ?? []) {
      map.set(room.id, getMockRoomStatus(room.id));
    }
    return map;
  }, [rooms]);

  const renderItem = useCallback<ListRenderItem<Room>>(
    ({ item }) => <RoomCard room={item} status={statusById.get(item.id) ?? 'available'} />,
    [statusById],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">Study Rooms</AppText>
        <AppText color="textSecondary" style={styles.subtitle}>
          {rooms === undefined ? 'Loading rooms…' : `${rooms.length} rooms across VKU`}
        </AppText>

        <AppInput
          editable={false}
          placeholder="Search by room, building or equipment"
          accessibilityLabel="Search rooms (coming soon)"
          style={styles.search}
        />

        <View style={styles.filters}>
          {BUILDING_CHIPS.map((building) => (
            <Badge key={building} label={`Building ${building}`} />
          ))}
        </View>
        <AppText variant="caption" color="textSecondary">
          Search and filters are coming next.
        </AppText>
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
          data={rooms}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState title="No rooms yet" />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  subtitle: {
    marginTop: -spacing.xs,
  },
  search: {
    marginTop: spacing.sm,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
