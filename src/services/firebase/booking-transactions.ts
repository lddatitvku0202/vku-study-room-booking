/**
 * Atomic booking with a client `runTransaction()` (29R) — the core of the project.
 *
 *   derive slotKey → tx.get(slotLocks/{slotKey}) + tx.get(bookings/{bookingId})
 *   → decideBookingOutcome → on PROCEED: tx.set(booking) + tx.set(lock), one commit
 *
 * Firestore decides the winner at commit time (I2): if another client changes the
 * lock between our read and our commit, the transaction is retried with fresh
 * reads and then sees SLOT_TAKEN (I5). Booking and lock are written together and
 * never separately (I3); Security Rules enforce that coupling server-side (I9).
 * A retry with the same bookingId returns the existing booking instead of
 * creating a second one (I6). Nothing is reported as success before the commit.
 *
 * Takes the Firestore instance and uid as parameters so the same code runs in the
 * app and against the emulator (N-parallel contention tests).
 */

import { doc, getDoc, runTransaction, type Firestore } from 'firebase/firestore';

import {
  bookingFromDocument,
  cancellationUpdate,
  COLLECTIONS,
  newBookingDocument,
  newSlotLockDocument,
} from '@/services/firebase/model';
import {
  decideBookingOutcome,
  decideCancellation,
  mapFirestoreErrorCode,
  validateBookingRequest,
  type BookingDecision,
  type BookingOutcome,
  type BookingRequest,
  type CancelOutcome,
  type ExistingState,
} from '@/utils/booking-contract';
import { errorCodeOf } from '@/utils/firebase-errors';

import type { Booking } from '@/types/booking';
import type { TimeSlot } from '@/types/slot';

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function text(data: unknown, key: string): string {
  return isRecord(data) && typeof data[key] === 'string' ? data[key] : '';
}

/** The booking as committed (server timestamps estimated as "now" for display). */
function committedBooking(
  request: BookingRequest,
  uid: string,
  slot: TimeSlot,
  slotKey: string,
  now: Date,
): Booking {
  const time = now.toISOString();
  return {
    id: request.bookingId,
    userId: uid,
    roomId: request.room.id,
    roomName: request.room.name,
    building: request.room.building,
    date: request.date,
    slotId: slot.id,
    slotLabel: slot.label,
    startTime: slot.start,
    endTime: slot.end,
    slotKey,
    status: 'confirmed',
    createdAt: time,
    updatedAt: time,
  };
}

/**
 * Books `request` for `uid`. Resolves with a typed outcome; never throws for
 * expected failures (conflict, rules, network).
 */
export async function createBookingTransaction(
  db: Firestore,
  uid: string,
  request: BookingRequest,
  now: Date = new Date(),
): Promise<BookingOutcome> {
  const validation = validateBookingRequest(request, now);
  if (!validation.ok) {
    return { kind: 'error', code: validation.code };
  }
  const { slot, slotKey } = validation;
  const lockRef = doc(db, COLLECTIONS.slotLocks, slotKey);
  const bookingRef = doc(db, COLLECTIONS.bookings, request.bookingId);

  let decision: BookingDecision;
  let replayedBooking: Booking | null = null;
  try {
    decision = await runTransaction(db, async (tx) => {
      // All reads before any write (a Firestore transaction requirement).
      const lockSnapshot = await tx.get(lockRef);
      const bookingSnapshot = await tx.get(bookingRef);
      const lockData: unknown = lockSnapshot.data();
      const bookingData: unknown = bookingSnapshot.data({ serverTimestamps: 'estimate' });

      const existing: ExistingState = {
        // A lock that exists counts as taken even if malformed (never overwrite it).
        lock: lockSnapshot.exists()
          ? { bookingId: text(lockData, 'bookingId'), userId: text(lockData, 'userId') }
          : null,
        booking: bookingSnapshot.exists()
          ? {
              userId: text(bookingData, 'userId'),
              status: text(bookingData, 'status') === 'cancelled' ? 'cancelled' : 'confirmed',
            }
          : null,
      };
      const outcome = decideBookingOutcome(existing, { bookingId: request.bookingId, uid });

      if (outcome === 'PROCEED') {
        const input = {
          bookingId: request.bookingId,
          userId: uid,
          room: request.room,
          date: request.date,
          slot,
        };
        tx.set(bookingRef, newBookingDocument(input));
        tx.set(lockRef, newSlotLockDocument(input));
      } else if (outcome === 'IDEMPOTENT_SUCCESS') {
        replayedBooking = bookingFromDocument(bookingSnapshot.id, bookingData);
      }
      return outcome;
    });
  } catch (error: unknown) {
    const code = errorCodeOf(error);
    if (code === 'aborted') {
      // Firestore gave up after its own retries under heavy contention. The
      // transaction wrote nothing; read what actually happened to the slot.
      return resolveAfterAbort(db, uid, request, slot, slotKey, now);
    }
    return { kind: 'error', code: mapFirestoreErrorCode(code) };
  }

  switch (decision) {
    case 'PROCEED':
      return {
        kind: 'success',
        booking: committedBooking(request, uid, slot, slotKey, now),
        replayed: false,
      };
    case 'IDEMPOTENT_SUCCESS':
      return {
        kind: 'success',
        booking: replayedBooking ?? committedBooking(request, uid, slot, slotKey, now),
        replayed: true,
      };
    case 'SLOT_TAKEN':
      return { kind: 'conflict', slotKey };
    case 'BOOKING_ID_CONFLICT':
      return { kind: 'error', code: 'BOOKING_ID_CONFLICT' };
  }
}

async function resolveAfterAbort(
  db: Firestore,
  uid: string,
  request: BookingRequest,
  slot: TimeSlot,
  slotKey: string,
  now: Date,
): Promise<BookingOutcome> {
  try {
    const lock = await getDoc(doc(db, COLLECTIONS.slotLocks, slotKey));
    if (!lock.exists()) {
      return { kind: 'error', code: 'UNKNOWN' };
    }
    const data: unknown = lock.data();
    return text(data, 'bookingId') === request.bookingId && text(data, 'userId') === uid
      ? {
          kind: 'success',
          booking: committedBooking(request, uid, slot, slotKey, now),
          replayed: true,
        }
      : { kind: 'conflict', slotKey };
  } catch (error: unknown) {
    return { kind: 'error', code: mapFirestoreErrorCode(errorCodeOf(error)) };
  }
}

/**
 * Cancels a booking and releases its slot lock in ONE transaction (35R, I7):
 * read the booking (and its lock) → `decideCancellation` (owner, still confirmed,
 * slot not started) → set status cancelled with server timestamps and delete the
 * lock in the same commit. The rules refuse a lock release without this coupled
 * cancellation, and a cancellation by anyone but the owner.
 */
export async function cancelBookingTransaction(
  db: Firestore,
  uid: string,
  bookingId: string,
  now: Date = new Date(),
): Promise<CancelOutcome> {
  const bookingRef = doc(db, COLLECTIONS.bookings, bookingId);
  try {
    const decision = await runTransaction(db, async (tx) => {
      const bookingSnapshot = await tx.get(bookingRef);
      const booking = bookingSnapshot.exists()
        ? bookingFromDocument(
            bookingSnapshot.id,
            bookingSnapshot.data({ serverTimestamps: 'estimate' }),
          )
        : null;
      const outcome = decideCancellation(booking, uid, now);
      if (outcome !== 'PROCEED' || booking === null) {
        return outcome;
      }
      const lockRef = doc(db, COLLECTIONS.slotLocks, booking.slotKey);
      const lockSnapshot = await tx.get(lockRef);
      tx.update(bookingRef, { ...cancellationUpdate() });
      if (lockSnapshot.exists() && text(lockSnapshot.data(), 'bookingId') === bookingId) {
        tx.delete(lockRef);
      }
      return outcome;
    });
    return decision === 'PROCEED'
      ? { kind: 'cancelled', bookingId }
      : { kind: 'error', code: decision };
  } catch (error: unknown) {
    return { kind: 'error', code: mapFirestoreErrorCode(errorCodeOf(error)) };
  }
}
