import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useCallback } from 'react';

import { roomKeys } from '@/hooks/query-keys';
import { fetchRooms } from '@/services/room-repository';

import type { Room } from '@/types/room';

/** The room catalogue, read as server state under the `['rooms']` key. */
export function useRooms(): UseQueryResult<readonly Room[]> {
  return useQuery({ queryKey: roomKeys.all, queryFn: fetchRooms });
}

/**
 * One room, selected from the same `['rooms']` cache entry — opening a room
 * never triggers a second fetch. `data` is `undefined` if no room has that id.
 */
export function useRoom(roomId: string): UseQueryResult<Room | undefined> {
  const selectRoom = useCallback(
    (rooms: readonly Room[]) => rooms.find((room) => room.id === roomId),
    [roomId],
  );
  return useQuery({ queryKey: roomKeys.all, queryFn: fetchRooms, select: selectRoom });
}
