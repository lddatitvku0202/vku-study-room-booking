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
import { fetchRoomCatalogue } from '@/services/firebase/rooms';

import type { Room } from '@/types/room';
import type { UserSession } from '@/types/session';

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
