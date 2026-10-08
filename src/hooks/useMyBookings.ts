import { useMemo } from 'react';

import { bookingKeys } from '@/hooks/query-keys';
import { useDataSource } from '@/hooks/useDataSource';
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
import { subscribeViaBackend } from '@/hooks/useRoomAvailability';
import { useSession } from '@/hooks/useSession';
import { useBookingStore, useBookingStoreHydrated } from '@/store/useBookingStore';

import type { Booking } from '@/types/booking';

export interface MyBookings {
  readonly bookings: readonly Booking[];
  readonly isLoading: boolean;
  readonly hasError: boolean;
}

const NONE: readonly Booking[] = [];

/**
 * The signed-in user's bookings (confirmed and cancelled history).
 *
 * - mock: the device store (the MVP — local demo bookings);
 * - firebase: a realtime `onSnapshot` over `bookings where userId == uid`, bridged
 *   into the TanStack Query cache. Firestore owns these bookings: they are never
 *   copied into Zustand or persisted to AsyncStorage (AD-04/AD-38). The rules
 *   only allow a query scoped to the caller's own uid.
 */
export function useMyBookings(): MyBookings {
  const isFirebase = useDataSource() === 'firebase';
  const session = useSession();
  const stored = useBookingStore((state) => state.bookings);
  const isHydrated = useBookingStoreHydrated();
  const uid = session.status === 'signed-in' ? session.session.uid : '';

  const realtime = useRealtimeQuery<readonly Booking[]>({
    queryKey: bookingKeys.mine(uid),
    enabled: isFirebase && uid !== '',
    subscribe: (onData, onError) =>
      subscribeViaBackend((backend) => backend.subscribeToMyBookings(onData, onError), onError),
  });

  const sessionFailed = session.status === 'error';
  const snapshot = realtime.data;
  const hasError = realtime.error !== undefined || sessionFailed;

  return useMemo((): MyBookings => {
    if (!isFirebase) {
      return { bookings: stored, isLoading: !isHydrated, hasError: false };
    }
    return {
      bookings: snapshot ?? NONE,
      isLoading: snapshot === undefined && !hasError,
      hasError,
    };
  }, [isFirebase, stored, isHydrated, snapshot, hasError]);
}
