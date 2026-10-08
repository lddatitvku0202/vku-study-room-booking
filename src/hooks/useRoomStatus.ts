import { useCallback, useMemo } from 'react';

import { availabilityKeys } from '@/hooks/query-keys';
import { useDataSource } from '@/hooks/useDataSource';
import { useNow } from '@/hooks/useNow';
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
import { subscribeViaBackend } from '@/hooks/useRoomAvailability';
import { deriveRoomStatus, occupiedRoomIds } from '@/utils/availability';
import { toDateKey } from '@/utils/booking-dates';
import { getMockRoomStatus } from '@/utils/mock-room-status';

import type { SlotLockSnapshot } from '@/types/booking';
import type { RoomStatus } from '@/types/room';

export interface RoomStatusSource {
  /** Status of a room right now. */
  readonly statusOf: (roomId: string) => RoomStatus;
  /** True when statuses are derived from real bookings (firebase mode). */
  readonly isLive: boolean;
}

const NO_LOCKS: SlotLockSnapshot['locks'] = [];

/**
 * "Available Now" / "Occupied" for the room list and room details.
 *
 * - mock mode: the MVP's deterministic demo label (`getMockRoomStatus`);
 * - firebase mode: derived from today's slot locks — one bounded realtime
 *   listener (`slotLocks where date == today`) for the whole list, never one per
 *   row (AD-31). Occupied = a booked slot covers the current time. Booking-based,
 *   not sensor occupancy (AD-32). Re-evaluated every minute.
 */
export function useRoomStatus(): RoomStatusSource {
  const isFirebase = useDataSource() === 'firebase';
  const now = useNow();
  const today = toDateKey(now);

  const realtime = useRealtimeQuery<SlotLockSnapshot>({
    queryKey: availabilityKeys.date(today),
    enabled: isFirebase,
    subscribe: (onData, onError) =>
      subscribeViaBackend(
        (backend) => backend.subscribeToDateLocks(today, onData, onError),
        onError,
      ),
  });

  const locks = realtime.data?.locks ?? NO_LOCKS;
  const occupied = useMemo(() => occupiedRoomIds(locks, now), [locks, now]);

  const statusOf = useCallback(
    (roomId: string): RoomStatus =>
      isFirebase ? deriveRoomStatus(roomId, occupied) : getMockRoomStatus(roomId),
    [isFirebase, occupied],
  );

  return useMemo(() => ({ statusOf, isLive: isFirebase }), [statusOf, isFirebase]);
}
