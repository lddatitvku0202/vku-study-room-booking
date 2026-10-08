import { useCallback } from 'react';

import { useDataSource } from '@/hooks/useDataSource';
import { loadFirebaseBackend } from '@/services/firebase-backend';
import { cancelScheduledNotification } from '@/services/local-notifications';
import { useBookingStore } from '@/store/useBookingStore';

import type { CancelOutcome } from '@/utils/booking-contract';

function cancelReminder(bookingId: string, notificationId: string | undefined): void {
  if (notificationId === undefined) {
    return;
  }
  cancelScheduledNotification(notificationId).catch((error: unknown) => {
    if (__DEV__) {
      console.warn('[bookings] could not cancel the reminder for', bookingId, error);
    }
  });
}

/**
 * Cancels a booking (kept as history) and frees its slot.
 *
 * - mock: the device store marks it cancelled, frees the slot and drops its
 *   conflict mark in one update (the MVP);
 * - firebase: the cancellation transaction (35R) — status cancelled and the slot
 *   lock released in one commit, so another user can book the slot at once (I7).
 *
 * The local reminder is cancelled only AFTER the cancellation is confirmed, and
 * never blocks it: the notification id is device-local client state, never the
 * booking authority. If cancelling the reminder fails, the worst case is a stale
 * reminder, not a stale booking.
 */
export function useCancelBooking(): (bookingId: string) => Promise<CancelOutcome> {
  const isFirebase = useDataSource() === 'firebase';
  const cancelLocal = useBookingStore((state) => state.cancelBooking);
  const takeNotificationId = useBookingStore((state) => state.takeNotificationId);

  return useCallback(
    async (bookingId: string): Promise<CancelOutcome> => {
      if (!isFirebase) {
        const result = cancelLocal(bookingId);
        if (result.kind === 'not-found') {
          return { kind: 'error', code: 'NOT_FOUND' };
        }
        if (result.kind === 'already-cancelled') {
          return { kind: 'error', code: 'ALREADY_CANCELLED' };
        }
        cancelReminder(bookingId, result.notificationId);
        return { kind: 'cancelled', bookingId };
      }

      let outcome: CancelOutcome;
      try {
        const backend = await loadFirebaseBackend();
        outcome = await backend.cancelBooking(bookingId);
      } catch {
        outcome = { kind: 'error', code: 'UNAUTHENTICATED' };
      }
      if (outcome.kind === 'cancelled') {
        cancelReminder(bookingId, takeNotificationId(bookingId));
      }
      return outcome;
    },
    [isFirebase, cancelLocal, takeNotificationId],
  );
}
