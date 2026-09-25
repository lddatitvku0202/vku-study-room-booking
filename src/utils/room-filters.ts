/**
 * Pure room filtering — search and filters combined with AND logic.
 *
 * A room is kept only if it satisfies every active criterion:
 *   name contains the search text (case-insensitive)
 *   AND building matches (when one is selected)
 *   AND capacity ≥ the minimum (when one is selected)
 *   AND the room has ALL selected equipment.
 *
 * Equipment is "must have all selected": choosing Projector + AC means the room
 * needs both, which is what a user picking features expects.
 *
 * No React, no I/O — called from a `useMemo` in the screen, never per row.
 */

import type { RoomFilters } from '@/types/filters';
import type { Room } from '@/types/room';

/** Filters with nothing selected. */
export const EMPTY_FILTERS: RoomFilters = { search: '', equipment: [] };

export function normalizeSearch(text: string): string {
  return text.trim().toLowerCase();
}

/** True when any search text or filter is active. */
export function hasActiveFilters(filters: RoomFilters): boolean {
  return (
    normalizeSearch(filters.search) !== '' ||
    filters.building !== undefined ||
    filters.minimumCapacity !== undefined ||
    filters.equipment.length > 0
  );
}

export function filterRooms(rooms: readonly Room[], filters: RoomFilters): readonly Room[] {
  // Nothing to filter by: hand back the same array so FlatList sees stable data.
  if (!hasActiveFilters(filters)) {
    return rooms;
  }

  const query = normalizeSearch(filters.search);
  const { building, minimumCapacity, equipment } = filters;

  return rooms.filter(
    (room) =>
      (query === '' || room.name.toLowerCase().includes(query)) &&
      (building === undefined || room.building === building) &&
      (minimumCapacity === undefined || room.capacity >= minimumCapacity) &&
      equipment.every((item) => room.equipment.includes(item)),
  );
}
