/**
 * Room catalogue reads from Firestore (12R).
 *
 * Takes the Firestore instance as a parameter (runs against the emulator in
 * tests). Every document is validated by `roomFromDocument`; a malformed room is
 * skipped rather than crashing the list. Sorted by id, which is the catalogue's
 * own order (building → floor → room), so the list looks exactly as in mock mode.
 */

import { collection, getDocs, type Firestore } from 'firebase/firestore';

import { COLLECTIONS, roomFromDocument } from '@/services/firebase/model';

import type { Room } from '@/types/room';

export interface RoomCatalogue {
  readonly rooms: readonly Room[];
  /** Ids of documents that failed validation and were skipped. */
  readonly skipped: readonly string[];
}

export async function fetchRoomCatalogue(db: Firestore): Promise<RoomCatalogue> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.rooms));
  const rooms: Room[] = [];
  const skipped: string[] = [];
  for (const document of snapshot.docs) {
    const room = roomFromDocument(document.id, document.data());
    if (room === null) skipped.push(document.id);
    else rooms.push(room);
  }
  rooms.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { rooms, skipped };
}
