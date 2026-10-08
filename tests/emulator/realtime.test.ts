/**
 * Realtime availability (26R): one client's commit reaches another client's
 * listener without a refresh (CLAUDE.md §16 "two-client test").
 */

import { type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, writeBatch, type Firestore } from 'firebase/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  cancellationUpdate,
  COLLECTIONS,
  newBookingDocument,
  newSlotLockDocument,
  type NewBookingInput,
} from '@/services/firebase/model';
import { listenToDateLocks, listenToRoomLocks } from '@/services/firebase/slot-locks';
import { buildSlotKey } from '@/utils/slot-key';

import {
  campusDate,
  disposeClients,
  FIRST_SLOT,
  LAST_SLOT,
  ROOM_A101,
  ROOM_B205,
  seedRooms,
  signedInActor,
  startRulesEnvironment,
  type Actor,
} from './rules-env';

import type { SlotLockSnapshot } from '@/types/booking';

let env: RulesTestEnvironment;
let watcher: Actor;
let booker: Actor;

beforeAll(async () => {
  env = await startRulesEnvironment();
  await env.clearFirestore();
  await seedRooms(env, [ROOM_B205, ROOM_A101]);
  [watcher, booker] = await Promise.all([signedInActor('watcher'), signedInActor('booker')]);
});
afterAll(async () => {
  await disposeClients();
  await env.cleanup();
});

/** Collects snapshots and lets a test wait for one that matches. */
function recorder() {
  const snapshots: SlotLockSnapshot[] = [];
  const waiters: { predicate: (s: SlotLockSnapshot) => boolean; resolve: () => void }[] = [];
  return {
    snapshots,
    onNext(snapshot: SlotLockSnapshot): void {
      snapshots.push(snapshot);
      for (const waiter of [...waiters]) {
        if (waiter.predicate(snapshot)) {
          waiters.splice(waiters.indexOf(waiter), 1);
          waiter.resolve();
        }
      }
    },
    waitFor(predicate: (s: SlotLockSnapshot) => boolean, timeoutMs = 10_000): Promise<void> {
      if (snapshots.some(predicate)) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('no matching snapshot')), timeoutMs);
        waiters.push({
          predicate,
          resolve: () => {
            clearTimeout(timer);
            resolve();
          },
        });
      });
    },
  };
}

function book(db: Firestore, i: NewBookingInput): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, COLLECTIONS.bookings, i.bookingId), newBookingDocument(i));
  batch.set(
    doc(db, COLLECTIONS.slotLocks, buildSlotKey(i.room.id, i.date, i.slot.id)),
    newSlotLockDocument(i),
  );
  return batch.commit();
}

function cancel(db: Firestore, i: NewBookingInput): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, COLLECTIONS.bookings, i.bookingId), { ...cancellationUpdate() });
  batch.delete(doc(db, COLLECTIONS.slotLocks, buildSlotKey(i.room.id, i.date, i.slot.id)));
  return batch.commit();
}

describe('two clients, one slot grid', () => {
  it('a booking and its cancellation on client B reach client A’s listener', async () => {
    const date = campusDate(2);
    const grid = recorder();
    const errors: unknown[] = [];
    const stop = listenToRoomLocks(watcher.db, ROOM_B205.id, date, grid.onNext, (e) =>
      errors.push(e),
    );

    await grid.waitFor((s) => s.fromServer && s.locks.length === 0);

    const bookingB205: NewBookingInput = {
      bookingId: 'rt-b205',
      userId: booker.uid,
      room: ROOM_B205,
      date,
      slot: FIRST_SLOT,
    };
    const bookingA101: NewBookingInput = { ...bookingB205, bookingId: 'rt-a101', room: ROOM_A101 };
    await book(booker.db, bookingA101); // another room: must not appear in this grid
    await book(booker.db, bookingB205);

    await grid.waitFor((s) => s.locks.some((l) => l.bookingId === 'rt-b205'));
    const latest = grid.snapshots[grid.snapshots.length - 1];
    expect(latest?.locks.map((l) => l.roomId)).toEqual(['room-B205']);
    expect(latest?.locks[0]?.userId).toBe(booker.uid);

    await cancel(booker.db, bookingB205);
    await grid.waitFor((s) => s.fromServer && s.locks.length === 0);

    stop();
    expect(errors).toEqual([]);
  });

  it('the date listener (room-list status) sees every room booked that day', async () => {
    const date = campusDate(3);
    const day = recorder();
    const stop = listenToDateLocks(watcher.db, date, day.onNext, () => undefined);
    await day.waitFor((s) => s.fromServer);
    const base: NewBookingInput = {
      bookingId: 'day-1',
      userId: booker.uid,
      room: ROOM_B205,
      date,
      slot: FIRST_SLOT,
    };
    await book(booker.db, base);
    await book(booker.db, { ...base, bookingId: 'day-2', room: ROOM_A101, slot: LAST_SLOT });
    await day.waitFor((s) => s.locks.length === 2);
    stop();
  });

  it('a signed-out client gets a permission error instead of data', async () => {
    const { unauthenticatedClient } = await import('./rules-env');
    const errors: unknown[] = [];
    const stop = listenToRoomLocks(
      unauthenticatedClient().db,
      ROOM_B205.id,
      campusDate(2),
      () => undefined,
      (e) => errors.push(e),
    );
    await new Promise((resolve) => setTimeout(resolve, 1500));
    stop();
    expect(errors[0]).toMatchObject({ code: 'permission-denied' });
  });
});
