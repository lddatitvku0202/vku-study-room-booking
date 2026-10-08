/**
 * The 70/30 contention demo with real transactions (32R): the hot slot always has
 * exactly one winner, every attempt is accounted for, and the measured ratio is
 * reported — not forced.
 */

import { type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { MOCK_ROOMS } from '@/data/rooms';
import { cleanUpContentionDemo, runContentionDemo } from '@/services/firebase/contention-demo';
import { planContention, summarizeContention } from '@/utils/contention-plan';

import {
  campusDate,
  disposeClients,
  FIRST_SLOT,
  seedRooms,
  signedInActor,
  startRulesEnvironment,
  type Actor,
} from './rules-env';

const PARTICIPANTS = 30;
let env: RulesTestEnvironment;
let participants: Actor[];

beforeAll(async () => {
  env = await startRulesEnvironment();
  await env.clearFirestore();
  await seedRooms(env, MOCK_ROOMS);
  participants = await Promise.all(
    Array.from({ length: PARTICIPANTS }, (_, i) => signedInActor(`p${i}`)),
  );
});
afterAll(async () => {
  await disposeClients();
  await env.cleanup();
});

function roomOf(roomId: string) {
  const room = MOCK_ROOMS.find((r) => r.id === roomId);
  if (room === undefined) throw new Error(roomId);
  return room;
}

describe('70/30 contention demo (real transactions)', () => {
  it.each([1, 2, 3])('run %i: one hot-slot winner, all attempts accounted for', async (run) => {
    const plan = planContention({
      participants: PARTICIPANTS,
      hotShare: 0.3,
      date: campusDate(run + 1),
      slotId: FIRST_SLOT.id,
      hotRoomId: MOCK_ROOMS[run]?.id ?? 'room-A101',
      independentRoomIds: MOCK_ROOMS.slice(40, 80).map((r) => r.id),
      minDelayMs: 1000,
      maxDelayMs: 1500,
      random: Math.random,
    });
    const result = await runContentionDemo(participants, plan, roomOf);
    const report = summarizeContention(plan, result.results);

    expect(report.hotAttempts).toBe(9);
    expect(report.hotSuccesses).toBe(1);
    expect(report.independentSuccesses).toBe(21);
    expect(report.successes + report.conflicts + report.errors).toBe(PARTICIPANTS);
    expect(report.errors).toBe(0);
    expect(report.conflicts).toBe(8);

    const released = await cleanUpContentionDemo(participants, result);
    expect(released).toBe(report.successes);
  });
});
