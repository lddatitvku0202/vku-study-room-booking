/**
 * Room data access — the single way the app obtains rooms.
 *
 * The data source is chosen by configuration (AD-37):
 * - `mock` (default): the local catalogue from `src/data/rooms.ts` — the Emergency
 *   MVP, no Firebase, no network, and no pretence otherwise (no fake latency);
 * - `firebase`: `rooms` from Firestore, read through the lazily loaded backend.
 *
 * `useRooms` and the screens are identical in both modes; only this function
 * changes, which is the point of keeping the abstraction.
 */

import { MOCK_ROOMS } from '@/data/rooms';
import { isFirebaseMode } from '@/services/config';
import { loadFirebaseBackend } from '@/services/firebase-backend';

import type { Room } from '@/types/room';

export async function fetchRooms(): Promise<readonly Room[]> {
  if (!isFirebaseMode) {
    return MOCK_ROOMS;
  }
  const backend = await loadFirebaseBackend();
  return backend.fetchRooms();
}
