/**
 * My Bookings (34R): each user's realtime list holds only their own bookings,
 * keeps cancelled history, and nobody can list someone else's.
 */

import { type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, writeBatch } from 'firebase/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createBookingTransaction } from '@/services/firebase/booking-transactions';
import { listenToUserBookings } from '@/services/firebase/bookings';
import { cancellationUpdate, COLLECTIONS } from '@/services/firebase/model';
import { createBookingId } from '@/utils/booking-contract';

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

import type { Booking } from '@/types/booking';

let env: RulesTestEnvironment;
let alice: Actor;
let bob: Actor;

beforeAll(async () => {
  env = await startRulesEnvironment();
  await env.clearFirestore();
  await seedRooms(env, [ROOM_B205, ROOM_A101]);
  [alice, bob] = await Promise.all([signedInActor('alice'), signedInActor('bob')]);
});
afterAll(async () => {
  await disposeClients();
  await env.cleanup();
});

async function book(
  actor: Actor,
  room = ROOM_B205,
  slotId: string = FIRST_SLOT.id,
): Promise<Booking> {
  const outcome = await createBookingTransaction(actor.db, actor.uid, {
    bookingId: createBookingId(),
    room,
    date: campusDate(4),
    slotId,
  });
  if (outcome.kind !== 'success') throw new Error(JSON.stringify(outcome));
  return outcome.booking;
}

function latestList(actor: Actor, owner: string) {
  let latest: readonly Booking[] | undefined;
  const errors: unknown[] = [];
  const stop = listenToUserBookings(
    actor.db,
    owner,
    (bookings) => {
      latest = bookings;
    },
    (error) => errors.push(error),
  );
  return {
    stop,
    errors,
    async waitFor(predicate: (list: readonly Booking[]) => boolean): Promise<readonly Booking[]> {
      for (let i = 0; i < 100; i += 1) {
        if (latest !== undefined && predicate(latest)) return latest;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error(`timed out; last list: ${JSON.stringify(latest)}`);
    },
  };
}

describe('My Bookings listener', () => {
  it('each user sees only their own bookings, and history survives a cancellation', async () => {
    const a1 = await book(alice, ROOM_B205, FIRST_SLOT.id);
    const a2 = await book(alice, ROOM_A101, LAST_SLOT.id);
    const b1 = await book(bob, ROOM_A101, FIRST_SLOT.id);

    const aliceList = latestList(alice, alice.uid);
    const bobList = latestList(bob, bob.uid);
    const ofAlice = await aliceList.waitFor((list) => list.length === 2);
    const ofBob = await bobList.waitFor((list) => list.length === 1);
    expect(ofAlice.map((b) => b.id).sort()).toEqual([a1.id, a2.id].sort());
    expect(ofBob.map((b) => b.id)).toEqual([b1.id]);
    expect(ofAlice.every((b) => b.userId === alice.uid)).toBe(true);

    const batch = writeBatch(alice.db);
    batch.update(doc(alice.db, COLLECTIONS.bookings, a1.id), { ...cancellationUpdate() });
    batch.delete(doc(alice.db, COLLECTIONS.slotLocks, a1.slotKey));
    await batch.commit();
    const afterCancel = await aliceList.waitFor((list) =>
      list.some((b) => b.id === a1.id && b.status === 'cancelled'),
    );
    expect(afterCancel).toHaveLength(2);
    expect(afterCancel.find((b) => b.id === a1.id)?.cancelledAt).toBeDefined();

    aliceList.stop();
    bobList.stop();
    expect([...aliceList.errors, ...bobList.errors]).toEqual([]);
  });

  it('listing another user’s bookings is refused', async () => {
    const snoop = latestList(bob, alice.uid);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    snoop.stop();
    expect(snoop.errors[0]).toMatchObject({ code: 'permission-denied' });
  });
});
