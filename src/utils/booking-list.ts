/**
 * Pure helpers for the "My Bookings" list.
 */

import type { Booking, BookingStatus } from '@/types/booking';

function compareBySchedule(a: Booking, b: Booking): number {
  return a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
}

/** Bookings with `status`, earliest date and time first. Never mutates the input. */
export function getBookingsByStatus(
  bookings: readonly Booking[],
  status: BookingStatus,
): readonly Booking[] {
  return bookings.filter((booking) => booking.status === status).sort(compareBySchedule);
}

export function countBookingsByStatus(
  bookings: readonly Booking[],
): Readonly<Record<BookingStatus, number>> {
  const counts: Record<BookingStatus, number> = { confirmed: 0, cancelled: 0 };
  for (const booking of bookings) {
    counts[booking.status] += 1;
  }
  return counts;
}
