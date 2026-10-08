/**
 * Cancellation transaction (35R, invariant I7) against the emulator with the real
 * rules: the lock is released in the same commit, so another user can book the
 * slot at once; only the owner can cancel; history is kept.
 */

import { type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  cancelBookingTransaction,
  createBookingTransaction,
} from '@/services/firebase/booking-transactions';
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

const request = (overrides: Partial<BookingRequest> = {}): BookingRequest => ({
  bookingId: createBookingId(),
  room: ROOM_B205,
  date: campusDate(1),
  slotId: FIRST_SLOT.id,
  ...overrides,
});

async function booked(actor: Actor, overrides: Partial<BookingRequest> = {}): Promise<Booking> {
  const outcome = await createBookingTransaction(actor.db, actor.uid, request(overrides));
  if (outcome.kind !== 'success') throw new Error(JSON.stringify(outcome));
  return outcome.booking;
}

async function snapshotOf(
  booking: Booking,
): Promise<{ status: unknown; lock: boolean; cancelledAt: unknown }> {
  let result = { status: undefined as unknown, lock: false, cancelledAt: undefined as unknown };
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const b = await db.collection('bookings').doc(booking.id).get();
    const l = await db.collection('slotLocks').doc(booking.slotKey).get();
    result = { status: b.get('status'), lock: l.exists, cancelledAt: b.get('cancelledAt') };
  });
  return result;
}

describe('cancelBookingTransaction', () => {
  it('cancels and releases the lock in one commit; history is kept', async () => {
    const booking = await booked(alice);
    expect(await cancelBookingTransaction(alice.db, alice.uid, booking.id)).toEqual({
      kind: 'cancelled',
      bookingId: booking.id,
    });
    const after = await snapshotOf(booking);
    expect(after.status).toBe('cancelled');
    expect(after.lock).toBe(false);
    expect(after.cancelledAt).toBeDefined();
  });

  it('another user can book the released slot immediately (I7)', async () => {
    const booking = await booked(alice);
    await cancelBookingTransaction(alice.db, alice.uid, booking.id);
    const rebook = await createBookingTransaction(bob.db, bob.uid, request());
    expect(rebook.kind).toBe('success');
  });

  it('another user cannot cancel (the rules refuse even reading it)', async () => {
    const booking = await booked(alice);
    expect(await cancelBookingTransaction(bob.db, bob.uid, booking.id)).toEqual({
      kind: 'error',
      code: 'PERMISSION_DENIED',
    });
    expect((await snapshotOf(booking)).status).toBe('confirmed');
  });

  it('cancelling twice → ALREADY_CANCELLED; unknown id → NOT_FOUND', async () => {
    const booking = await booked(alice);
    await cancelBookingTransaction(alice.db, alice.uid, booking.id);
    expect(await cancelBookingTransaction(alice.db, alice.uid, booking.id)).toEqual({
      kind: 'error',
      code: 'ALREADY_CANCELLED',
    });
    expect(await cancelBookingTransaction(alice.db, alice.uid, 'no-such-booking-id')).toEqual({
      kind: 'error',
      code: 'NOT_FOUND',
    });
  });

  it('a booking whose slot has started cannot be cancelled', async () => {
    const booking = await booked(alice);
    // Evaluate "now" after the slot start: the decision refuses before any write.
    const afterStart = new Date(
      Date.parse(`${booking.date}T${booking.startTime}:00+07:00`) + 60_000,
    );
    expect(await cancelBookingTransaction(alice.db, alice.uid, booking.id, afterStart)).toEqual({
      kind: 'error',
      code: 'PAST_SLOT',
    });
    expect((await snapshotOf(booking)).lock).toBe(true);
  });

  it('a started slot is also protected by the rules (seeded past booking)', async () => {
    const past = '2020-01-01';
    const slotKey = `${ROOM_B205.id}_${past}_${FIRST_SLOT.id}`;
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection('bookings').doc('past-booking-1').set({
        bookingId: 'past-booking-1',
        userId: alice.uid,
        roomId: ROOM_B205.id,
        roomName: ROOM_B205.name,
        building: ROOM_B205.building,
        date: past,
        slotId: FIRST_SLOT.id,
        slotLabel: FIRST_SLOT.label,
        startTime: FIRST_SLOT.start,
        endTime: FIRST_SLOT.end,
        slotKey,
        status: 'confirmed',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        cancelledAt: null,
      });
      await db.collection('slotLocks').doc(slotKey).set({
        slotKey,
        roomId: ROOM_B205.id,
        date: past,
        slotId: FIRST_SLOT.id,
        bookingId: 'past-booking-1',
        userId: alice.uid,
        createdAt: Timestamp.now(),
      });
    });
    // Pretend the client thinks it is still 2019: the transaction tries, the rules refuse.
    const outcome = await cancelBookingTransaction(
      alice.db,
      alice.uid,
      'past-booking-1',
      new Date('2019-12-31T00:00:00Z'),
    );
    expect(outcome).toEqual({ kind: 'error', code: 'PERMISSION_DENIED' });
  });

  it('concurrent cancel and re-book never leave two active bookings (5 rounds)', async () => {
    for (let round = 0; round < 5; round += 1) {
      const date = campusDate(2 + round); // a distinct slot per round (2–6 days ahead)
      const room = round % 2 === 0 ? ROOM_A101 : ROOM_B205;
      const booking = await booked(alice, { room, date });
      const [cancel, rebook] = await Promise.all([
        cancelBookingTransaction(alice.db, alice.uid, booking.id),
        createBookingTransaction(bob.db, bob.uid, request({ room, date })),
      ]);
      expect(cancel.kind).toBe('cancelled');
      let confirmed = 0;
      let locks = 0;
      await env.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        const bookings = await db
          .collection('bookings')
          .where('slotKey', '==', booking.slotKey)
          .get();
        confirmed = bookings.docs.filter((d) => d.get('status') === 'confirmed').length;
        locks = (await db.collection('slotLocks').doc(booking.slotKey).get()).exists ? 1 : 0;
      });
      expect(confirmed).toBeLessThanOrEqual(1);
      expect(locks).toBe(confirmed);
      expect(confirmed).toBe(rebook.kind === 'success' ? 1 : 0);
    }
  });
});
