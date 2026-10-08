/**
 * Runs the 70/30 contention demo with REAL Firestore transactions (32R).
 *
 * Every participant is its own Firebase client with its own anonymous user. Each
 * waits its planned 1–1.5 s delay (Promise + setTimeout) and then calls the same
 * `createBookingTransaction` the app uses. Nothing is simulated or forced: the
 * hot slot yields exactly one winner because Firestore decides (I1/I2); the
 * independent slots succeed because they are free. Not imported by the app —
 * used by `scripts/contention-demo.ts` and the emulator tests only.
 */

import {
  cancelBookingTransaction,
  createBookingTransaction,
} from '@/services/firebase/booking-transactions';
import { createBookingId } from '@/utils/booking-contract';

import type { Room } from '@/types/room';
import type { AttemptResult, PlannedAttempt } from '@/utils/contention-plan';
import type { Firestore } from 'firebase/firestore';

export interface DemoParticipant {
  readonly db: Firestore;
  readonly uid: string;
}

export interface DemoRun {
  readonly results: readonly AttemptResult[];
  /** Bookings that succeeded, so the demo can clean up after itself. */
  readonly booked: readonly { readonly participant: number; readonly bookingId: string }[];
  readonly latenciesMs: readonly number[];
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function runContentionDemo(
  participants: readonly DemoParticipant[],
  plan: readonly PlannedAttempt[],
  roomOf: (roomId: string) => Pick<Room, 'id' | 'name' | 'building'>,
): Promise<DemoRun> {
  const booked: { participant: number; bookingId: string }[] = [];
  const latenciesMs: number[] = new Array<number>(plan.length).fill(0);

  const results = await Promise.all(
    plan.map(async (attempt, index): Promise<AttemptResult> => {
      const participant = participants[attempt.participant];
      if (participant === undefined) return 'error';
      await wait(attempt.delayMs);
      const bookingId = createBookingId();
      const started = Date.now();
      const outcome = await createBookingTransaction(participant.db, participant.uid, {
        bookingId,
        room: roomOf(attempt.roomId),
        date: attempt.date,
        slotId: attempt.slotId,
      });
      latenciesMs[index] = Date.now() - started;
      if (outcome.kind === 'success') {
        booked.push({ participant: attempt.participant, bookingId });
        return 'success';
      }
      return outcome.kind === 'conflict' ? 'conflict' : 'error';
    }),
  );
  return { results, booked, latenciesMs };
}

/** Cancels every booking the demo made (each by its own owner), releasing the locks. */
export async function cleanUpContentionDemo(
  participants: readonly DemoParticipant[],
  run: DemoRun,
): Promise<number> {
  const outcomes = await Promise.all(
    run.booked.map(async ({ participant, bookingId }) => {
      const owner = participants[participant];
      if (owner === undefined) return false;
      const outcome = await cancelBookingTransaction(owner.db, owner.uid, bookingId);
      return outcome.kind === 'cancelled';
    }),
  );
  return outcomes.filter(Boolean).length;
}
