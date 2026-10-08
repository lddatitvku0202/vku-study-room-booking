/**
 * Security Rules v2 (30R): the rules enforce the booking-transaction invariants
 * even against a client that skips the app's transaction code.
 */

import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createBookingTransaction } from '@/services/firebase/booking-transactions';
import {
  cancellationUpdate,
  COLLECTIONS,
  newBookingDocument,
  newSlotLockDocument,
} from '@/services/firebase/model';
import { createBookingId, type BookingRequest } from '@/utils/booking-contract';
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

import type { Booking } from '@/types/booking';

let env: RulesTestEnvironment;
let alice: Actor;
let bob: Actor;

beforeAll(async () => {
  env = await startRulesEnvironment();
  [alice, bob] = await Promise.all([signedInActor('alice'), signedInActor('bob')]);
});
afterAll(async () => {
  await disposeClients();
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await seedRooms(env, [ROOM_B205, ROOM_A101]);
});

function request(overrides: Partial<BookingRequest> = {}): BookingRequest {
  return {
    bookingId: createBookingId(),
    room: ROOM_B205,
    date: campusDate(1),
    slotId: FIRST_SLOT.id,
    ...overrides,
  };
}

async function booked(actor: Actor, overrides: Partial<BookingRequest> = {}): Promise<Booking> {
  const outcome = await createBookingTransaction(actor.db, actor.uid, request(overrides));
  if (outcome.kind !== 'success')
    throw new Error(`setup booking failed: ${JSON.stringify(outcome)}`);
  return outcome.booking;
}

describe('the legitimate transaction passes the rules', () => {
  it('booking + lock written by runTransaction are accepted', async () => {
    const booking = await booked(alice);
    expect(booking.status).toBe('confirmed');
  });

  it('a malformed (too short) booking id is refused', async () => {
    const outcome = await createBookingTransaction(
      alice.db,
      alice.uid,
      request({ bookingId: 'abc' }),
    );
    expect(outcome).toEqual({ kind: 'error', code: 'PERMISSION_DENIED' });
  });
});

describe('a confirmed booking cannot be edited, moved or reassigned', () => {
  it.each([
    ['change the room name', { roomName: 'Penthouse' }],
    ['move it to another date', { date: campusDate(2) }],
    ['point it at another slot key', { slotKey: 'room-B205_2026-01-01_07:30-09:30' }],
    ['give it to another user', { userId: 'someone-else' }],
  ])('the owner cannot %s', async (_label, patch) => {
    const booking = await booked(alice);
    await assertFails(updateDoc(doc(alice.db, COLLECTIONS.bookings, booking.id), patch));
  });
});

describe('a lock cannot be stolen through a crafted commit', () => {
  it('deleting another user’s lock and taking the slot in one commit is denied', async () => {
    const victim = await booked(alice);
    const thief = {
      bookingId: createBookingId(),
      userId: bob.uid,
      room: ROOM_B205,
      date: victim.date,
      slot: FIRST_SLOT,
    };
    const batch = writeBatch(bob.db);
    batch.delete(doc(bob.db, COLLECTIONS.slotLocks, victim.slotKey));
    batch.set(doc(bob.db, COLLECTIONS.bookings, thief.bookingId), newBookingDocument(thief));
    batch.set(doc(bob.db, COLLECTIONS.slotLocks, victim.slotKey), newSlotLockDocument(thief));
    await assertFails(batch.commit());
  });

  it('cancelling your own booking while releasing someone else’s lock is denied', async () => {
    const mine = await booked(bob, { slotId: LAST_SLOT.id });
    const theirs = await booked(alice);
    const batch = writeBatch(bob.db);
    batch.update(doc(bob.db, COLLECTIONS.bookings, mine.id), { ...cancellationUpdate() });
    batch.delete(doc(bob.db, COLLECTIONS.slotLocks, theirs.slotKey));
    await assertFails(batch.commit());
  });

  it('after the winner books, the loser’s transaction is a conflict and a direct write is denied', async () => {
    const winner = await booked(alice, { room: ROOM_A101 });
    const loser = await createBookingTransaction(bob.db, bob.uid, request({ room: ROOM_A101 }));
    expect(loser).toEqual({ kind: 'conflict', slotKey: winner.slotKey });
    const direct = {
      bookingId: createBookingId(),
      userId: bob.uid,
      room: ROOM_A101,
      date: winner.date,
      slot: FIRST_SLOT,
    };
    const batch = writeBatch(bob.db);
    batch.set(doc(bob.db, COLLECTIONS.bookings, direct.bookingId), newBookingDocument(direct));
    batch.set(
      doc(bob.db, COLLECTIONS.slotLocks, buildSlotKey(ROOM_A101.id, winner.date, FIRST_SLOT.id)),
      newSlotLockDocument(direct),
    );
    await assertFails(batch.commit());
  });

  it('the owner’s coupled cancellation of a transaction-made booking is accepted', async () => {
    const booking = await booked(alice);
    const batch = writeBatch(alice.db);
    batch.update(doc(alice.db, COLLECTIONS.bookings, booking.id), { ...cancellationUpdate() });
    batch.delete(doc(alice.db, COLLECTIONS.slotLocks, booking.slotKey));
    await assertSucceeds(batch.commit());
  });
});
