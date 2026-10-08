/**
 * Security Rules (09R) — negative paths first. Requests go through real modular
 * SDK clients signed in anonymously on the Auth emulator, exactly like the app.
 * Writes here use batches on purpose: rules cannot tell a batch from a
 * transaction (AD-30), so these tests prove the *coupling* and ownership checks.
 * The transaction itself is tested in booking-transaction.test.ts.
 */

import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

import {
  cancellationUpdate,
  COLLECTIONS,
  newBookingDocument,
  newSlotLockDocument,
  roomToDocument,
  type NewBookingInput,
} from '@/services/firebase/model';
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
  unauthenticatedClient,
  type Actor,
} from './rules-env';

let env: RulesTestEnvironment;
let alice: Actor;
let bob: Actor;
let mallory: Actor;
let nobody: Firestore;

beforeAll(async () => {
  env = await startRulesEnvironment();
  [alice, bob, mallory] = await Promise.all([
    signedInActor('alice'),
    signedInActor('bob'),
    signedInActor('mallory'),
  ]);
  nobody = unauthenticatedClient().db;
});
afterAll(async () => {
  await disposeClients();
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await seedRooms(env, [ROOM_B205, ROOM_A101]);
});

function input(owner: Actor, overrides: Partial<NewBookingInput> = {}): NewBookingInput {
  return {
    bookingId: `bk-${Math.random().toString(36).slice(2, 10)}`,
    userId: owner.uid,
    room: ROOM_B205,
    date: campusDate(1),
    slot: FIRST_SLOT,
    ...overrides,
  };
}
const keyOf = (i: NewBookingInput): string => buildSlotKey(i.room.id, i.date, i.slot.id);

/** Booking + lock in one commit, with optional field overrides on either document. */
function coupledWrite(
  db: Firestore,
  i: NewBookingInput,
  bookingPatch: Record<string, unknown> = {},
  lockPatch: Record<string, unknown> = {},
): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, COLLECTIONS.bookings, i.bookingId), {
    ...newBookingDocument(i),
    ...bookingPatch,
  });
  batch.set(doc(db, COLLECTIONS.slotLocks, keyOf(i)), { ...newSlotLockDocument(i), ...lockPatch });
  return batch.commit();
}

/** A valid booking + lock written by its owner — the legitimate path. */
async function existingBooking(
  owner: Actor,
  overrides: Partial<NewBookingInput> = {},
): Promise<NewBookingInput> {
  const i = input(owner, overrides);
  await assertSucceeds(coupledWrite(owner.db, i));
  return i;
}

function cancelWrite(db: Firestore, i: NewBookingInput): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, COLLECTIONS.bookings, i.bookingId), { ...cancellationUpdate() });
  batch.delete(doc(db, COLLECTIONS.slotLocks, keyOf(i)));
  return batch.commit();
}

describe('unauthenticated access is denied everywhere', () => {
  it('cannot read rooms, locks or bookings', async () => {
    const i = await existingBooking(alice);
    await assertFails(getDoc(doc(nobody, COLLECTIONS.rooms, ROOM_B205.id)));
    await assertFails(getDoc(doc(nobody, COLLECTIONS.slotLocks, keyOf(i))));
    await assertFails(getDoc(doc(nobody, COLLECTIONS.bookings, i.bookingId)));
  });

  it('cannot book', async () => {
    await assertFails(coupledWrite(nobody, input(alice)));
  });
});

describe('rooms', () => {
  it('signed-in users can read rooms', async () => {
    await assertSucceeds(getDocs(collection(alice.db, COLLECTIONS.rooms)));
  });

  it('clients can never write rooms', async () => {
    await assertFails(
      setDoc(doc(alice.db, COLLECTIONS.rooms, 'room-Z999'), roomToDocument(ROOM_B205)),
    );
    await assertFails(updateDoc(doc(alice.db, COLLECTIONS.rooms, ROOM_B205.id), { capacity: 99 }));
    await assertFails(deleteDoc(doc(alice.db, COLLECTIONS.rooms, ROOM_B205.id)));
  });
});

describe('booking ↔ lock coupling', () => {
  it('a booking and its lock written together by the owner succeed', async () => {
    await assertSucceeds(coupledWrite(alice.db, input(alice)));
  });

  it('a booking without its lock is denied', async () => {
    const i = input(alice);
    await assertFails(
      setDoc(doc(alice.db, COLLECTIONS.bookings, i.bookingId), newBookingDocument(i)),
    );
  });

  it('a lock without its booking is denied', async () => {
    const i = input(alice);
    await assertFails(
      setDoc(doc(alice.db, COLLECTIONS.slotLocks, keyOf(i)), newSlotLockDocument(i)),
    );
  });

  it('a lock pointing at a different booking is denied', async () => {
    await assertFails(
      coupledWrite(alice.db, input(alice), {}, { bookingId: 'someone-elses-booking' }),
    );
  });

  it('a lock for a different slot than its booking is denied', async () => {
    const i = input(alice);
    const other = { ...i, slot: LAST_SLOT };
    const batch = writeBatch(alice.db);
    batch.set(doc(alice.db, COLLECTIONS.bookings, i.bookingId), newBookingDocument(i));
    batch.set(doc(alice.db, COLLECTIONS.slotLocks, keyOf(other)), newSlotLockDocument(other));
    await assertFails(batch.commit());
  });
});

describe('identity cannot be forged', () => {
  it('a booking for another user is denied (forged userId on both documents)', async () => {
    await assertFails(coupledWrite(mallory.db, input(alice)));
  });

  it('a forged userId on the lock only is denied', async () => {
    await assertFails(coupledWrite(alice.db, input(alice), {}, { userId: bob.uid }));
  });

  it('a forged userId on the booking only is denied', async () => {
    await assertFails(coupledWrite(alice.db, input(alice), { userId: bob.uid }));
  });
});

describe('an active lock cannot be stolen', () => {
  it('another user cannot book a taken slot', async () => {
    const taken = await existingBooking(alice);
    await assertFails(coupledWrite(bob.db, input(bob, { date: taken.date })));
  });

  it('another user cannot overwrite the lock directly', async () => {
    const taken = await existingBooking(alice);
    const thief = input(bob, { date: taken.date });
    await assertFails(
      setDoc(doc(bob.db, COLLECTIONS.slotLocks, keyOf(taken)), newSlotLockDocument(thief)),
    );
  });

  it('not even the owner can modify an existing lock', async () => {
    const taken = await existingBooking(alice);
    await assertFails(
      updateDoc(doc(alice.db, COLLECTIONS.slotLocks, keyOf(taken)), { bookingId: 'x' }),
    );
  });

  it('another user cannot delete the lock', async () => {
    const taken = await existingBooking(alice);
    await assertFails(deleteDoc(doc(bob.db, COLLECTIONS.slotLocks, keyOf(taken))));
  });
});

describe('booking content is validated', () => {
  it.each([
    ['a status other than confirmed', { status: 'cancelled' }],
    ['a client-chosen createdAt', { createdAt: Timestamp.fromMillis(0) }],
    ['a pre-filled cancelledAt', { cancelledAt: serverTimestamp() }],
    [
      'a slotKey that does not match room/date/slot',
      { slotKey: 'room-A101_2026-01-01_07:30-09:30' },
    ],
    ['a wrong slot label', { slotLabel: '07:30 - 10:30' }],
    ['a wrong end time', { endTime: '10:00' }],
    ['a room name that is not the room', { roomName: 'Penthouse' }],
    ['a building that is not the room', { building: 'C' }],
    ['an extra field', { paid: true }],
    ['a bookingId field ≠ document id', { bookingId: 'other-id' }],
  ])('rejects %s', async (_label, patch) => {
    await assertFails(coupledWrite(alice.db, input(alice), patch));
  });

  it('rejects a room that does not exist', async () => {
    const ghost = { ...ROOM_B205, id: 'room-Z999' };
    await assertFails(coupledWrite(alice.db, input(alice, { room: ghost })));
  });

  it('rejects a slot in the past', async () => {
    await assertFails(coupledWrite(alice.db, input(alice, { date: campusDate(-1) })));
  });

  it('rejects a date beyond the booking window', async () => {
    await assertFails(coupledWrite(alice.db, input(alice, { date: campusDate(10) })));
  });

  it('bookings can never be deleted, not even by the owner', async () => {
    const i = await existingBooking(alice);
    await assertFails(deleteDoc(doc(alice.db, COLLECTIONS.bookings, i.bookingId)));
  });
});

describe('reading bookings', () => {
  it('the owner can read their booking; others cannot', async () => {
    const i = await existingBooking(alice);
    await assertSucceeds(getDoc(doc(alice.db, COLLECTIONS.bookings, i.bookingId)));
    await assertFails(getDoc(doc(bob.db, COLLECTIONS.bookings, i.bookingId)));
  });

  it('a query must be scoped to the caller’s own bookings', async () => {
    await existingBooking(alice);
    const own = query(collection(alice.db, COLLECTIONS.bookings), where('userId', '==', alice.uid));
    await assertSucceeds(getDocs(own));
    await assertFails(getDocs(collection(alice.db, COLLECTIONS.bookings)));
    const others = query(
      collection(bob.db, COLLECTIONS.bookings),
      where('userId', '==', alice.uid),
    );
    await assertFails(getDocs(others));
  });

  it('any signed-in user can see which slots are locked', async () => {
    const i = await existingBooking(alice);
    await assertSucceeds(getDoc(doc(bob.db, COLLECTIONS.slotLocks, keyOf(i))));
  });
});

describe('cancellation', () => {
  it('the owner cancels and releases the lock in one commit', async () => {
    const i = await existingBooking(alice);
    await assertSucceeds(cancelWrite(alice.db, i));
  });

  it('another user cannot cancel', async () => {
    const i = await existingBooking(alice);
    await assertFails(cancelWrite(bob.db, i));
  });

  it('cancelling without releasing the lock is denied', async () => {
    const i = await existingBooking(alice);
    await assertFails(
      updateDoc(doc(alice.db, COLLECTIONS.bookings, i.bookingId), { ...cancellationUpdate() }),
    );
  });

  it('releasing the lock without cancelling is denied', async () => {
    const i = await existingBooking(alice);
    await assertFails(deleteDoc(doc(alice.db, COLLECTIONS.slotLocks, keyOf(i))));
  });

  it('a cancellation may not change other fields', async () => {
    const i = await existingBooking(alice);
    const batch = writeBatch(alice.db);
    batch.update(doc(alice.db, COLLECTIONS.bookings, i.bookingId), {
      ...cancellationUpdate(),
      roomName: 'x',
    });
    batch.delete(doc(alice.db, COLLECTIONS.slotLocks, keyOf(i)));
    await assertFails(batch.commit());
  });

  it('a cancelled booking cannot be cancelled again or revived', async () => {
    const i = await existingBooking(alice);
    await assertSucceeds(cancelWrite(alice.db, i));
    await assertFails(
      updateDoc(doc(alice.db, COLLECTIONS.bookings, i.bookingId), { ...cancellationUpdate() }),
    );
    await assertFails(
      updateDoc(doc(alice.db, COLLECTIONS.bookings, i.bookingId), { status: 'confirmed' }),
    );
  });

  it('after a cancellation another user can book the released slot', async () => {
    const i = await existingBooking(alice);
    await assertSucceeds(cancelWrite(alice.db, i));
    await assertSucceeds(coupledWrite(bob.db, input(bob, { date: i.date })));
  });
});
