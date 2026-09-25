import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { roomKeys } from '@/hooks/query-keys';
import { fetchRooms } from '@/services/room-repository';

import type { Room } from '@/types/room';

/** The room catalogue, read as server state under the `['rooms']` key. */
export function useRooms(): UseQueryResult<readonly Room[]> {
  return useQuery({ queryKey: roomKeys.all, queryFn: fetchRooms });
}
