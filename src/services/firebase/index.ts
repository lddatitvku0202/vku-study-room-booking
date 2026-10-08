/**
 * The firebase-mode backend: everything the app calls when `DATA_SOURCE=firebase`.
 *
 * Loaded only through `loadFirebaseBackend()` (dynamic import), never imported
 * statically from outside `src/services/firebase/`, so mock mode never evaluates
 * the Firebase SDK and the web build downloads it only in firebase mode.
 *
 * The modules it composes take their `Auth` / `Firestore` instance as a
 * parameter (so they run against the emulator in tests); this file binds them to
 * the app's lazily created instances.
 */

import { getFirebaseServices } from '@/services/firebase/app';
import {
  ensureAnonymousSession as ensureSessionFor,
  sessionErrorCodeOf,
  subscribeToSession as subscribeFor,
} from '@/services/firebase/auth';
import { createBookingTransaction } from '@/services/firebase/booking-transactions';
import { fetchRoomCatalogue } from '@/services/firebase/rooms';
import {
  listenToDateLocks,
  listenToRoomLocks,
  type ErrorListener,
  type LockListener,
} from '@/services/firebase/slot-locks';

import type { Room } from '@/types/room';
import type { UserSession } from '@/types/session';
import type { BookingOutcome, BookingRequest } from '@/utils/booking-contract';

export { getFirebaseServices, sessionErrorCodeOf };

/** Signs in anonymously if needed and resolves with the session. */
export function ensureAnonymousSession(): Promise<UserSession> {
  return ensureSessionFor(getFirebaseServices().auth);
}

export function subscribeToSession(listener: (session: UserSession | null) => void): () => void {
  return subscribeFor(getFirebaseServices().auth, listener);
}

/** The room catalogue from Firestore (rules require a signed-in user). */
export async function fetchRooms(): Promise<readonly Room[]> {
  await ensureAnonymousSession();
  const { rooms, skipped } = await fetchRoomCatalogue(getFirebaseServices().db);
  if (skipped.length > 0 && __DEV__) {
    console.warn(`[rooms] skipped ${skipped.length} malformed room document(s):`, skipped);
  }
  return rooms;
}

/**
 * Starts a listener once the anonymous session exists (the rules require a
 * signed-in user to read locks). Returns a stop function that also works while
 * the session is still being established.
 */
function afterSession(start: () => () => void, onError: ErrorListener): () => void {
  let stop: (() => void) | undefined;
  let stopped = false;
  ensureAnonymousSession().then(
    () => {
      if (!stopped) stop = start();
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

/** Realtime locks of one room on one date. */
export function subscribeToRoomLocks(
  roomId: string,
  date: string,
  onNext: LockListener,
  onError: ErrorListener,
): () => void {
  return afterSession(
    () => listenToRoomLocks(getFirebaseServices().db, roomId, date, onNext, onError),
    onError,
  );
}

/** Realtime locks of all rooms on one date. */
export function subscribeToDateLocks(
  date: string,
  onNext: LockListener,
  onError: ErrorListener,
): () => void {
  return afterSession(
    () => listenToDateLocks(getFirebaseServices().db, date, onNext, onError),
    onError,
  );
}

/** The signed-in uid, if any (never signs in). */
export function currentUserId(): string | undefined {
  return getFirebaseServices().auth.currentUser?.uid;
}

/**
 * Books a slot for the signed-in user through the atomic Firestore transaction.
 * The Firestore commit is the only authority (I2); the outcome is typed.
 */
export async function createBooking(request: BookingRequest): Promise<BookingOutcome> {
  const session = await ensureAnonymousSession();
  return createBookingTransaction(getFirebaseServices().db, session.uid, request);
}
