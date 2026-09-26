import { useCallback } from 'react';

import { cancelScheduledNotification } from '@/services/local-notifications';
import { useBookingStore, type CancelBookingResult } from '@/store/useBookingStore';

/**
 * Cancels a demo booking: the store marks it cancelled (kept as history), frees
 * its slot and drops its conflict mark in one update; then, if a reminder was
 * recorded for it, the scheduled local notification is cancelled.
 *
 * The notification step runs after the booking is already cancelled and never
 * blocks it. If it fails, the worst case is a stale reminder, not a stale booking.
 */
export function useCancelBooking(): (bookingId: string) => CancelBookingResult {
  const cancelBooking = useBookingStore((state) => state.cancelBooking);

  return useCallback(
    (bookingId: string) => {
      const result = cancelBooking(bookingId);
      if (result.kind === 'cancelled' && result.notificationId !== undefined) {
        cancelScheduledNotification(result.notificationId).catch((error: unknown) => {
          if (__DEV__) {
            console.warn('[bookings] could not cancel the reminder for', bookingId, error);
          }
        });
      }
      return result;
    },
    [cancelBooking],
  );
}
