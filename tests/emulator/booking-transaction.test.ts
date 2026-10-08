/**
 * The atomic booking transaction (29R) against the Firestore emulator with the
 * real Security Rules: exactly one winner under contention, idempotent retries,
 * and no way around the rules.
 */

import { type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, writeBatch } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createBookingTransaction } from '@/services/firebase/booking-transactions';
import { cancellationUpdate, COLLECTIONS } from '@/services/firebase/model';
import { createBookingId, type BookingRequest } from '@/utils/booking-contract';

import {
  campusDate,
  disposeClients,
  FIRST_SLOT,
  ROOM_A101,
  ROOM_B205,
  seedRooms,
  signedInActor,
  startRulesEnvironment,
  unauthenticatedClient,
  type Actor,
} from './rules-env';

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

/** Counts documents with rules disabled (the test's god view). */
async function countFor(
  slotKey: string,
): Promise<{ locks: number; confirmed: number; total: number }> {
  let result = { locks: 0, confirmed: 0, total: 0 };
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const lock = await db.collection('slotLocks').doc(slotKey).get();
    const bookings = await db.collection('bookings').where('slotKey', '==', slotKey).get();
    result = {
      locks: lock.exists ? 1 : 0,
      confirmed: bookings.docs.filter((d) => d.get('status') === 'confirmed').length,
      total: bookings.size,
    };
  });
  return result;
}

describe('createBookingTransaction', () => {
  it('books a free slot: booking + lock committed together', async () => {
    const outcome = await createBookingTransaction(alice.db, alice.uid, request());
    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') return;
    expect(outcome.replayed).toBe(false);
    expect(outcome.booking.userId).toBe(alice.uid);
    expect(await countFor(outcome.booking.slotKey)).toEqual({ locks: 1, confirmed: 1, total: 1 });
  });

  it('N = 20 users race for one slot: exactly 1 success, 19 SLOT_TAKEN', async () => {
    const racers = await Promise.all(
      Array.from({ length: 20 }, (_, i) => signedInActor(`racer${i}`)),
    );
    const shared = { room: ROOM_A101, date: campusDate(2), slotId: FIRST_SLOT.id };
    const outcomes = await Promise.all(
      racers.map((racer) => createBookingTransaction(racer.db, racer.uid, request(shared))),
    );
    const successes = outcomes.filter((o) => o.kind === 'success');
    const conflicts = outcomes.filter((o) => o.kind === 'conflict');
    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(19);
    const slotKey = `${ROOM_A101.id}_${shared.date}_${FIRST_SLOT.id}`;
    expect(await countFor(slotKey)).toEqual({ locks: 1, confirmed: 1, total: 1 });
  });

  it('a retry with the same bookingId returns the same booking, never a second one (I6)', async () => {
    const same = request();
    const first = await createBookingTransaction(alice.db, alice.uid, same);
    const retry = await createBookingTransaction(alice.db, alice.uid, same);
    expect(first.kind).toBe('success');
    expect(retry).toMatchObject({ kind: 'success', replayed: true });
    if (retry.kind === 'success') expect(retry.booking.id).toBe(same.bookingId);
    const slotKey = `${ROOM_B205.id}_${same.date}_${FIRST_SLOT.id}`;
    expect(await countFor(slotKey)).toEqual({ locks: 1, confirmed: 1, total: 1 });
  });

  it('a double tap (two concurrent calls, same attempt) still yields one booking', async () => {
    const same = request({ date: campusDate(3) });
    const [a, b] = await Promise.all([
      createBookingTransaction(alice.db, alice.uid, same),
      createBookingTransaction(alice.db, alice.uid, same),
    ]);
    expect([a.kind, b.kind]).toEqual(['success', 'success']);
    const slotKey = `${ROOM_B205.id}_${same.date}_${FIRST_SLOT.id}`;
    expect(await countFor(slotKey)).toEqual({ locks: 1, confirmed: 1, total: 1 });
  });

  it('a later attempt on a taken slot is a typed conflict', async () => {
    await createBookingTransaction(alice.db, alice.uid, request());
    const outcome = await createBookingTransaction(bob.db, bob.uid, request());
    expect(outcome).toEqual({
      kind: 'conflict',
      slotKey: `${ROOM_B205.id}_${campusDate(1)}_${FIRST_SLOT.id}`,
    });
  });

  it('reusing a booking id after its booking was cancelled is refused', async () => {
    const first = request();
    const outcome = await createBookingTransaction(alice.db, alice.uid, first);
    if (outcome.kind !== 'success') throw new Error('setup failed');
    const batch = writeBatch(alice.db);
    batch.update(doc(alice.db, COLLECTIONS.bookings, first.bookingId), { ...cancellationUpdate() });
    batch.delete(doc(alice.db, COLLECTIONS.slotLocks, outcome.booking.slotKey));
    await batch.commit();
    const reuse = await createBookingTransaction(
      alice.db,
      alice.uid,
      request({ bookingId: first.bookingId, slotId: '09:30-11:30' }),
    );
    expect(reuse).toEqual({ kind: 'error', code: 'BOOKING_ID_CONFLICT' });
  });

  it('validation errors return before any network call', async () => {
    expect(
      await createBookingTransaction(alice.db, alice.uid, request({ date: campusDate(-1) })),
    ).toEqual({
      kind: 'error',
      code: 'PAST_SLOT',
    });
    expect(
      await createBookingTransaction(alice.db, alice.uid, request({ date: campusDate(9) })),
    ).toEqual({
      kind: 'error',
      code: 'OUTSIDE_WINDOW',
    });
    expect(await createBookingTransaction(alice.db, alice.uid, request({ slotId: 'x' }))).toEqual({
      kind: 'error',
      code: 'INVALID_SLOT',
    });
  });

  it('a signed-out client is refused by the rules', async () => {
    const outcome = await createBookingTransaction(unauthenticatedClient().db, 'nobody', request());
    expect(outcome).toEqual({ kind: 'error', code: 'PERMISSION_DENIED' });
  });

  it('booking in someone else’s name is refused by the rules (forged uid)', async () => {
    const outcome = await createBookingTransaction(alice.db, bob.uid, request());
    expect(outcome).toEqual({ kind: 'error', code: 'PERMISSION_DENIED' });
    expect(await countFor(`${ROOM_B205.id}_${campusDate(1)}_${FIRST_SLOT.id}`)).toEqual({
      locks: 0,
      confirmed: 0,
      total: 0,
    });
  });
});
