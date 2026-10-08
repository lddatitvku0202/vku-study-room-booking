/**
 * Offline policy (36R, AD-44): no offline booking queue.
 *
 * Finding recorded while writing this test: Firestore's `disableNetwork()` pauses
 * listeners and the queued-write pipeline, but NOT transactions — a transaction
 * still reached the emulator and committed. So:
 *   - `disableNetwork()` is used here only to check the availability signal the UI
 *     locks booking on (server-confirmed vs cache);
 *   - a genuinely unreachable server is simulated with a client pointed at a dead
 *     port, to check that a booking attempt fails (no success, nothing written).
 * The app writes bookings only through transactions, which are never placed in
 * Firestore's offline write queue, so there is nothing to replay later.
 */

import { type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteApp, initializeApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  disableNetwork,
  enableNetwork,
  getFirestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createBookingTransaction } from '@/services/firebase/booking-transactions';
import { listenToRoomLocks } from '@/services/firebase/slot-locks';
import { createBookingId, type BookingOutcome } from '@/utils/booking-contract';
import { withTimeout } from '@/utils/with-timeout';

import { DEMO_PROJECT_ID } from './emulator-env';
import {
  campusDate,
  disposeClients,
  FIRST_SLOT,
  ROOM_B205,
  seedRooms,
  signedInActor,
  startRulesEnvironment,
  type Actor,
} from './rules-env';

import type { SlotLockSnapshot } from '@/types/booking';

const DEAD_PORT = 8089; // nothing listens here: a server the client cannot reach

let env: RulesTestEnvironment;
let alice: Actor;

beforeAll(async () => {
  env = await startRulesEnvironment();
  await env.clearFirestore();
  await seedRooms(env, [ROOM_B205]);
  alice = await signedInActor('offline-alice');
});
afterAll(async () => {
  await disposeClients();
  await env.cleanup();
});

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 300 && !predicate(); i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!predicate()) throw new Error('timed out');
}

describe('offline policy', () => {
  it('availability is marked not-server-confirmed while offline, and confirmed again after', async () => {
    const snapshots: SlotLockSnapshot[] = [];
    const stop = listenToRoomLocks(
      alice.db,
      ROOM_B205.id,
      campusDate(1),
      (s) => snapshots.push(s),
      () => undefined,
    );
    await waitFor(() => snapshots.some((s) => s.fromServer));
    await disableNetwork(alice.db);
    await waitFor(() => snapshots[snapshots.length - 1]?.fromServer === false);
    await enableNetwork(alice.db);
    await waitFor(() => snapshots[snapshots.length - 1]?.fromServer === true);
    stop();
  });

  it('with the server unreachable a booking fails (never success) and nothing is written', async () => {
    const app = initializeApp(
      { projectId: DEMO_PROJECT_ID, apiKey: 'demo-api-key' },
      `unreachable-${Date.now()}`,
    );
    const db = getFirestore(app);
    connectFirestoreEmulator(db, '127.0.0.1', DEAD_PORT);
    const started = Date.now();
    const outcome = await withTimeout(
      createBookingTransaction(db, alice.uid, {
        bookingId: createBookingId(),
        room: ROOM_B205,
        date: campusDate(1),
        slotId: FIRST_SLOT.id,
      }),
      20_000,
      (): BookingOutcome => ({ kind: 'error', code: 'UNCONFIRMED' }),
    );
    console.info(
      `unreachable server → ${JSON.stringify(outcome)} after ${Date.now() - started} ms`,
    );
    expect(outcome.kind).toBe('error');
    if (outcome.kind === 'error') expect(['NETWORK', 'UNCONFIRMED']).toContain(outcome.code);

    let written = 0;
    await env.withSecurityRulesDisabled(async (context) => {
      const admin = context.firestore();
      written =
        (await admin.collection('bookings').get()).size +
        (await admin.collection('slotLocks').get()).size;
    });
    expect(written).toBe(0);
    await deleteApp(app);
  });
});
