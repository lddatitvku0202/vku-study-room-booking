/**
 * Pure booking rules for the local demo booking system.
 *
 * A slot is taken when a **confirmed** booking exists for its slot key.
 * Cancelled bookings never block a slot.
 */

import { buildSlotKey } from '@/utils/slot-key';

import type { Booking, BookingStatus } from '@/types/booking';
import type { Building } from '@/types/room';

const BUILDINGS: readonly string[] = ['A', 'B', 'C', 'V'] satisfies readonly Building[];
const STATUSES: readonly string[] = ['confirmed', 'cancelled'] satisfies readonly BookingStatus[];
const STRING_FIELDS = [
  'id',
  'userId',
  'roomId',
  'roomName',
  'date',
  'slotId',
  'slotLabel',
  'startTime',
  'endTime',
  'createdAt',
] as const;

export function getBookingSlotKey(booking: Booking): string {
  return buildSlotKey(booking.roomId, booking.date, booking.slotId);
}

/** The confirmed booking holding `slotKey`, if any. */
export function findConfirmedBooking(
  bookings: readonly Booking[],
  slotKey: string,
): Booking | undefined {
  return bookings.find(
    (booking) => booking.status === 'confirmed' && getBookingSlotKey(booking) === slotKey,
  );
}

/** Slot keys currently held by confirmed bookings. */
export function getConfirmedSlotKeys(bookings: readonly Booking[]): ReadonlySet<string> {
  const keys = new Set<string>();
  for (const booking of bookings) {
    if (booking.status === 'confirmed') {
      keys.add(getBookingSlotKey(booking));
    }
  }
  return keys;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Runtime check for data read back from storage. Persisted JSON is not trusted
 * to match the `Booking` type — a malformed entry is dropped, not cast.
 */
export function isBooking(value: unknown): value is Booking {
  if (!isRecord(value)) {
    return false;
  }
  const building = value['building'];
  const status = value['status'];
  return (
    STRING_FIELDS.every((field) => typeof value[field] === 'string') &&
    typeof building === 'string' &&
    BUILDINGS.includes(building) &&
    typeof status === 'string' &&
    STATUSES.includes(status)
  );
}
