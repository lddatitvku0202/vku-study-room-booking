import { useMemo } from 'react';

import { availabilityKeys } from '@/hooks/query-keys';
import { useDataSource } from '@/hooks/useDataSource';
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
import { useSession } from '@/hooks/useSession';
import { loadFirebaseBackend, type FirebaseBackend } from '@/services/firebase-backend';
import { useBookingStore, useBookingStoreHydrated } from '@/store/useBookingStore';
import { partitionLocks } from '@/utils/availability';
import { getConfirmedSlotKeys } from '@/utils/booking-rules';

import type { SlotLockSnapshot } from '@/types/booking';

/** A lock snapshot plus whether this listener has ever been server-confirmed. */
interface AvailabilitySnapshot extends SlotLockSnapshot {
  readonly everConfirmed: boolean;
}

export interface RoomAvailability {
  /** Slot keys held by this user (shown as "Your booking"). */
  readonly mine: ReadonlySet<string>;
  /** Slot keys held by someone else (firebase mode only). */
  readonly takenByOthers: ReadonlySet<string>;
  /**
   * True when availability is confirmed by the server. Always true in mock mode;
   * in firebase mode false until the first server snapshot and while offline.
   */
  readonly isLive: boolean;
  /**
   * True once this listener has had a server-confirmed snapshot. Lets the UI tell
   * "still connecting" (never confirmed yet) from "went offline" (confirmed before,
   * now only cached data).
   */
  readonly wasLive: boolean;
  readonly isLoading: boolean;
  readonly hasError: boolean;
}

const NONE: ReadonlySet<string> = new Set();

/** Starts a firebase-mode listener once the backend module is loaded. */
export function subscribeViaBackend(
  start: (backend: FirebaseBackend) => () => void,
  onError: (error: unknown) => void,
): () => void {
  let stop: (() => void) | undefined;
  let stopped = false;
  loadFirebaseBackend().then(
    (backend) => {
      if (!stopped) stop = start(backend);
    },
    (error: unknown) => {
      if (!stopped) onError(error);
    },
  );
  return () => {
    stopped = true;
    stop?.();
  };
}

/**
 * Which slots of one room on one date are taken, and by whom.
 *
 * - mock mode: the confirmed demo bookings on this device (the MVP behaviour);
 * - firebase mode: a realtime `onSnapshot` over `slotLocks where roomId, date`,
 *   bridged into the TanStack Query cache — another user's booking appears
 *   without a refresh. Realtime gives freshness; the transaction still decides
 *   who wins (AD-11).
 */
export function useRoomAvailability(roomId: string, date: string): RoomAvailability {
  const isFirebase = useDataSource() === 'firebase';
  const session = useSession();
  const bookings = useBookingStore((state) => state.bookings);
  const isHydrated = useBookingStoreHydrated();

  const realtime = useRealtimeQuery<AvailabilitySnapshot>({
    queryKey: availabilityKeys.room(roomId, date),
    enabled: isFirebase && roomId !== '' && date !== '',
    subscribe: (onData, onError) => {
      let everConfirmed = false;
      return subscribeViaBackend(
        (backend) =>
          backend.subscribeToRoomLocks(
            roomId,
            date,
            (snapshot) => {
              everConfirmed = everConfirmed || snapshot.fromServer;
              onData({ ...snapshot, everConfirmed });
            },
            onError,
          ),
        onError,
      );
    },
  });

  const uid = session.status === 'signed-in' ? session.session.uid : undefined;
  const snapshot = realtime.data;
  const hasError = realtime.error !== undefined;

  return useMemo((): RoomAvailability => {
    if (!isFirebase) {
      return {
        mine: getConfirmedSlotKeys(bookings),
        takenByOthers: NONE,
        isLive: true,
        wasLive: true,
        isLoading: !isHydrated,
        hasError: false,
      };
    }
    const { mine, others } = partitionLocks(snapshot?.locks ?? [], uid);
    return {
      mine,
      takenByOthers: others,
      isLive: snapshot?.fromServer ?? false,
      wasLive: snapshot?.everConfirmed ?? false,
      isLoading: snapshot === undefined && !hasError,
      hasError,
    };
  }, [isFirebase, bookings, isHydrated, snapshot, uid, hasError]);
}
