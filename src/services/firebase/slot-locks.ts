/**
 * Realtime slot-lock listeners (26R).
 *
 * Bounded queries only (CLAUDE.md §9): one room on one date (the slot grid), or
 * one date across rooms (today's status on the room list) — never the whole
 * collection, never one listener per row. Takes the Firestore instance as a
 * parameter, so the same code runs against the emulator in tests.
 *
 * Each snapshot says whether it is confirmed by the server (`fromServer`). A
 * snapshot served from the local cache may be stale; booking is only enabled on
 * server-confirmed availability (AD-44).
 */

import {
  collection,
  onSnapshot,
  query,
  where,
  type Firestore,
  type Query,
} from 'firebase/firestore';

import { COLLECTIONS, slotLockFromDocument } from '@/services/firebase/model';

import type { SlotLock, SlotLockSnapshot } from '@/types/booking';

export type LockListener = (snapshot: SlotLockSnapshot) => void;
export type ErrorListener = (error: unknown) => void;

function listen(q: Query, onNext: LockListener, onError: ErrorListener): () => void {
  return onSnapshot(
    q,
    // Metadata changes too, so a cache → server transition (back online) is delivered.
    { includeMetadataChanges: true },
    (snapshot) => {
      const locks: SlotLock[] = [];
      for (const document of snapshot.docs) {
        const lock = slotLockFromDocument(
          document.id,
          document.data({ serverTimestamps: 'estimate' }),
        );
        if (lock !== null) locks.push(lock);
      }
      onNext({ locks, fromServer: !snapshot.metadata.fromCache });
    },
    onError,
  );
}

/** Locks of one room on one date — the slot grid. */
export function listenToRoomLocks(
  db: Firestore,
  roomId: string,
  date: string,
  onNext: LockListener,
  onError: ErrorListener,
): () => void {
  const q = query(
    collection(db, COLLECTIONS.slotLocks),
    where('roomId', '==', roomId),
    where('date', '==', date),
  );
  return listen(q, onNext, onError);
}

/** All locks on one date — today's derived room status. */
export function listenToDateLocks(
  db: Firestore,
  date: string,
  onNext: LockListener,
  onError: ErrorListener,
): () => void {
  return listen(
    query(collection(db, COLLECTIONS.slotLocks), where('date', '==', date)),
    onNext,
    onError,
  );
}
