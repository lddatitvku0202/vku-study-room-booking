/**
 * The booking transaction contract (28R) — pure, framework-free, no Firebase.
 *
 * The Firestore transaction (`services/firebase/booking-transactions.ts`) and its
 * tests share these definitions, so the rule "who wins" exists exactly once:
 * the transaction reads the lock (and the booking id), and `decideBookingOutcome`
 * says what to do. Firestore decides the winner at commit time (I2); nothing here
 * uses randomness to decide an outcome (AD-38).
 */

import { isBefore, isValid } from 'date-fns';

import {
  BOOKING_WINDOW_DAYS,
  getBookableDates,
  isSlotPast,
  parseDateTime,
  toDateKey,
} from '@/utils/booking-dates';
import { findTimeSlot, isDateKey } from '@/utils/domain-guards';
import { buildSlotKey } from '@/utils/slot-key';

import type { Booking, BookingStatus } from '@/types/booking';
import type { Room } from '@/types/room';
import type { TimeSlot } from '@/types/slot';

/** Every way a booking or cancellation can fail — the single source of these codes. */
export type BookingErrorCode =
  /** Another booking holds the slot (lost the race, or booked earlier). */
  | 'SLOT_TAKEN'
  /** Not one of the four slots, or a malformed date. */
  | 'INVALID_SLOT'
  /** The slot has already started. */
  | 'PAST_SLOT'
  /** The date is outside the 7-day booking window. */
  | 'OUTSIDE_WINDOW'
  /** This booking id already belongs to a different (e.g. cancelled) booking. */
  | 'BOOKING_ID_CONFLICT'
  | 'UNAUTHENTICATED'
  /** Security Rules refused the write. */
  | 'PERMISSION_DENIED'
  /** No connection / the server could not be reached. */
  | 'NETWORK'
  /** The request was sent but its result could not be confirmed (AD-44). */
  | 'UNCONFIRMED'
  /** Cancellation: no such booking. */
  | 'NOT_FOUND'
  /** Cancellation: the booking belongs to someone else. */
  | 'NOT_OWNER'
  /** Cancellation: the booking is already cancelled. */
  | 'ALREADY_CANCELLED'
  | 'UNKNOWN';

/** What the client asks for. `bookingId` is generated once per attempt (I6). */
export interface BookingRequest {
  readonly bookingId: string;
  readonly room: Pick<Room, 'id' | 'name' | 'building'>;
  readonly date: string;
  readonly slotId: string;
}

export type BookingOutcome =
  | {
      readonly kind: 'success';
      readonly booking: Booking;
      /** True when a retry found this same booking already committed (idempotent). */
      readonly replayed: boolean;
    }
  | { readonly kind: 'conflict'; readonly slotKey: string }
  | { readonly kind: 'error'; readonly code: BookingErrorCode };

export type RequestValidation =
  | { readonly ok: true; readonly slot: TimeSlot; readonly slotKey: string }
  | { readonly ok: false; readonly code: 'INVALID_SLOT' | 'PAST_SLOT' | 'OUTSIDE_WINDOW' };

/** Client-side validation before any network call. The rules re-check server-side. */
export function validateBookingRequest(request: BookingRequest, now: Date): RequestValidation {
  const slot = findTimeSlot(request.slotId);
  if (
    slot === undefined ||
    !isDateKey(request.date) ||
    !isValid(parseDateTime(request.date, slot.start))
  ) {
    return { ok: false, code: 'INVALID_SLOT' };
  }
  if (isSlotPast(request.date, slot, now)) {
    return { ok: false, code: 'PAST_SLOT' };
  }
  const window = getBookableDates(toDateKey(now), BOOKING_WINDOW_DAYS);
  if (!window.some((day) => day.key === request.date)) {
    return { ok: false, code: 'OUTSIDE_WINDOW' };
  }
  return { ok: true, slot, slotKey: buildSlotKey(request.room.id, request.date, slot.id) };
}

const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const ID_LENGTH = 20;

/**
 * A new booking id (20 alphanumerics, the shape of a Firestore auto-id). Generate
 * it ONCE per booking attempt and reuse it on every retry of that attempt (I6).
 * Randomness here only makes ids unique; it never decides an outcome.
 */
export function createBookingId(random: () => number = Math.random): string {
  let id = '';
  for (let i = 0; i < ID_LENGTH; i += 1) {
    id += ID_ALPHABET.charAt(Math.floor(random() * ID_ALPHABET.length) % ID_ALPHABET.length);
  }
  return id;
}

export function isBookingId(value: string): boolean {
  return /^[A-Za-z0-9_-]{8,64}$/.test(value);
}

/** What the transaction found when it read the slot lock and the booking id. */
export interface ExistingState {
  readonly lock: { readonly bookingId: string; readonly userId: string } | null;
  readonly booking: { readonly userId: string; readonly status: BookingStatus } | null;
}

export type BookingDecision =
  'PROCEED' | 'IDEMPOTENT_SUCCESS' | 'SLOT_TAKEN' | 'BOOKING_ID_CONFLICT';

/**
 * The single decision inside the booking transaction:
 * - the lock exists and is this same attempt's (same bookingId, same user) → the
 *   earlier try already committed: success, not a second booking (I6);
 * - the lock exists for anything else → SLOT_TAKEN (I1, I5);
 * - no lock, but the booking id is already used → BOOKING_ID_CONFLICT (never
 *   overwrite history);
 * - otherwise → PROCEED: write booking + lock in this transaction (I3).
 */
export function decideBookingOutcome(
  existing: ExistingState,
  request: { readonly bookingId: string; readonly uid: string },
): BookingDecision {
  const { lock, booking } = existing;
  if (lock !== null) {
    return lock.bookingId === request.bookingId && lock.userId === request.uid
      ? 'IDEMPOTENT_SUCCESS'
      : 'SLOT_TAKEN';
  }
  return booking === null ? 'PROCEED' : 'BOOKING_ID_CONFLICT';
}

export type CancellationDecision =
  'PROCEED' | 'NOT_FOUND' | 'NOT_OWNER' | 'ALREADY_CANCELLED' | 'PAST_SLOT';

/** The decision inside the cancellation transaction (I7). */
export function decideCancellation(
  booking: Pick<Booking, 'userId' | 'status' | 'date' | 'startTime'> | null,
  uid: string,
  now: Date,
): CancellationDecision {
  if (booking === null) return 'NOT_FOUND';
  if (booking.userId !== uid) return 'NOT_OWNER';
  if (booking.status === 'cancelled') return 'ALREADY_CANCELLED';
  return isBefore(now, parseDateTime(booking.date, booking.startTime)) ? 'PROCEED' : 'PAST_SLOT';
}

/** Firestore error code → booking error code. */
export function mapFirestoreErrorCode(code: string | undefined): BookingErrorCode {
  switch (code) {
    case 'permission-denied':
      return 'PERMISSION_DENIED';
    case 'unauthenticated':
      return 'UNAUTHENTICATED';
    case 'unavailable':
    case 'deadline-exceeded':
      return 'NETWORK';
    default:
      return 'UNKNOWN';
  }
}
