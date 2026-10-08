/**
 * Pure booking rules shared by both data sources.
 *
 * A slot is taken when a **confirmed** booking exists for its slot key.
 * Cancelled bookings never block a slot.
 */

import { isBookingStatus, isBuilding } from '@/utils/domain-guards';
import { buildSlotKey } from '@/utils/slot-key';

import type { Booking } from '@/types/booking';

export function getBookingSlotKey(booking: Booking): string {
  return booking.slotKey;
}

/** The confirmed booking holding `slotKey`, if any. */
export function findConfirmedBooking(
  bookings: readonly Booking[],
  slotKey: string,
): Booking | undefined {
  return bookings.find((booking) => booking.status === 'confirmed' && booking.slotKey === slotKey);
}

/** Slot keys currently held by confirmed bookings. */
export function getConfirmedSlotKeys(bookings: readonly Booking[]): ReadonlySet<string> {
  const keys = new Set<string>();
  for (const booking of bookings) {
    if (booking.status === 'confirmed') {
      keys.add(booking.slotKey);
    }
  }
  return keys;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Validates a booking read back from device storage (mock mode). Persisted JSON
 * is not trusted to match the `Booking` type — a malformed entry is dropped
 * (`undefined`), not cast.
 *
 * Bookings saved by the submitted MVP have no `slotKey`; it is derived from their
 * own `roomId` / `date` / `slotId`, so those bookings keep working after the
 * upgrade instead of being dropped. A stored key that disagrees with those fields
 * marks the entry as corrupt.
 */
export function parseStoredBooking(value: unknown): Booking | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const id = readString(value, 'id');
  const userId = readString(value, 'userId');
  const roomId = readString(value, 'roomId');
  const roomName = readString(value, 'roomName');
  const building = value['building'];
  const date = readString(value, 'date');
  const slotId = readString(value, 'slotId');
  const slotLabel = readString(value, 'slotLabel');
  const startTime = readString(value, 'startTime');
  const endTime = readString(value, 'endTime');
  const status = value['status'];
  const createdAt = readString(value, 'createdAt');
  if (
    id === undefined ||
    userId === undefined ||
    roomId === undefined ||
    roomName === undefined ||
    !isBuilding(building) ||
    date === undefined ||
    slotId === undefined ||
    slotLabel === undefined ||
    startTime === undefined ||
    endTime === undefined ||
    !isBookingStatus(status) ||
    createdAt === undefined
  ) {
    return undefined;
  }
  const slotKey = buildSlotKey(roomId, date, slotId);
  const storedKey = readString(value, 'slotKey');
  if (storedKey !== undefined && storedKey !== slotKey) {
    return undefined;
  }
  return {
    id,
    userId,
    roomId,
    roomName,
    building,
    date,
    slotId,
    slotLabel,
    startTime,
    endTime,
    slotKey,
    status,
    createdAt,
    updatedAt: readString(value, 'updatedAt'),
    cancelledAt: readString(value, 'cancelledAt'),
  };
}
