/**
 * Booking and slot-lock domain types.
 *
 * These mirror the two documents written together by the booking transaction
 * (CLAUDE.md §6). They are plain TypeScript: Firestore `Timestamp` values are
 * converted to ISO strings in `src/services`, so the domain stays Firebase-free.
 */

import type { Building } from '@/types/room';

/** Lifecycle of a booking. A booking is never deleted, only cancelled. */
export type BookingStatus = 'confirmed' | 'cancelled';

/**
 * A reservation of one room, for one date, for one time slot.
 *
 * Room and slot details are denormalized onto the booking so history stays
 * readable without a second lookup, and so a past booking still renders
 * correctly if the room catalogue changes later.
 *
 * `date` is `yyyy-MM-dd`; `startTime`/`endTime` are `HH:mm`; `createdAt` is an
 * ISO 8601 string.
 */
export interface Booking {
  readonly id: string;
  readonly userId: string;
  readonly roomId: string;
  readonly roomName: string;
  readonly building: Building;
  readonly date: string;
  readonly slotId: string;
  readonly slotLabel: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly status: BookingStatus;
  readonly createdAt: string;
}

/**
 * The availability lock for one `(roomId, date, slotId)` combination.
 *
 * Its existence is what makes a slot taken — invariant I1: at most one active
 * lock per `slotKey`. The lock is created in the same transaction as its
 * booking and released when that booking is cancelled.
 *
 * `slotKey` is the document id, formatted `roomId_date_slotId`.
 */
export interface SlotLock {
  readonly slotKey: string;
  readonly roomId: string;
  readonly date: string;
  readonly slotId: string;
  readonly bookingId: string;
  readonly createdAt: string;
}
