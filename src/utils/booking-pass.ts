/**
 * The QR booking pass. Display-only (CLAUDE.md §13): nothing in the app scans
 * it, and no check-in backend reads it.
 */

import type { Booking } from '@/types/booking';

export const BOOKING_PASS_SEPARATOR = ' | ';

/** `bookingId | roomName | date | slotLabel`, e.g. `demo-1 | Study Room B205 | 2026-09-28 | 07:30 - 09:30`. */
export function buildBookingPassPayload(
  booking: Pick<Booking, 'id' | 'roomName' | 'date' | 'slotLabel'>,
): string {
  return [booking.id, booking.roomName, booking.date, booking.slotLabel].join(
    BOOKING_PASS_SEPARATOR,
  );
}
