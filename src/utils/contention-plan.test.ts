import { describe, expect, it } from 'vitest';

import { planContention, summarizeContention } from '@/utils/contention-plan';

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

const rooms = Array.from({ length: 40 }, (_, i) => `room-X${i}`);
const base = {
  participants: 30,
  hotShare: 0.3,
  date: '2026-10-10',
  slotId: '07:30-09:30',
  hotRoomId: 'room-HOT',
  independentRoomIds: rooms,
  minDelayMs: 1000,
  maxDelayMs: 1500,
  random: seeded(7),
};

describe('planContention (traffic only)', () => {
  it('30 participants: 9 aimed at the hot slot, 21 at distinct free slots', () => {
    const plan = planContention(base);
    const hot = plan.filter((a) => a.target === 'hot');
    const independent = plan.filter((a) => a.target === 'independent');
    expect(hot).toHaveLength(9);
    expect(independent).toHaveLength(21);
    expect(new Set(hot.map((a) => a.roomId))).toEqual(new Set(['room-HOT']));
    expect(new Set(independent.map((a) => a.roomId)).size).toBe(21);
    expect(independent.every((a) => a.roomId !== 'room-HOT')).toBe(true);
  });

  it('every delay is within 1–1.5 s', () => {
    const plan = planContention(base);
    expect(plan.every((a) => a.delayMs >= 1000 && a.delayMs <= 1500)).toBe(true);
  });

  it('needs at least two participants on the hot slot to create contention', () => {
    expect(
      planContention({ ...base, participants: 4 }).filter((a) => a.target === 'hot'),
    ).toHaveLength(2);
  });

  it('refuses a plan without enough independent rooms', () => {
    expect(() => planContention({ ...base, independentRoomIds: rooms.slice(0, 5) })).toThrow(
      'need 21',
    );
  });
});

describe('summarizeContention (measured, never forced)', () => {
  it('reports what happened', () => {
    const plan = planContention(base);
    const results = plan.map((a, i) =>
      a.target === 'independent'
        ? 'success'
        : i === plan.findIndex((p) => p.target === 'hot')
          ? 'success'
          : 'conflict',
    );
    const report = summarizeContention(plan, results);
    expect(report).toMatchObject({
      attempts: 30,
      successes: 22,
      conflicts: 8,
      errors: 0,
      hotAttempts: 9,
      hotSuccesses: 1,
      independentAttempts: 21,
      independentSuccesses: 21,
    });
    expect(report.successRate).toBeCloseTo(22 / 30);
  });
});
