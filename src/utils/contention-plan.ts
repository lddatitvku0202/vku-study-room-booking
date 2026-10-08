/**
 * The 70/30 contention demo as TRAFFIC distribution (CLAUDE.md §10, AD-16) — pure.
 *
 * About 70% of simulated participants target their own independent free slot and
 * about 30% target one shared "hot" slot. Each waits 1–1.5 s (Promise + setTimeout)
 * and then runs the REAL booking transaction. Randomness here only shapes traffic
 * (who targets what, and when); it never decides an outcome — Firestore does
 * (AD-38). Ratios are measured and reported, never forced.
 */

export interface ContentionPlanOptions {
  readonly participants: number;
  /** Share of participants aimed at the hot slot (course requirement: 0.3). */
  readonly hotShare: number;
  readonly date: string;
  readonly slotId: string;
  readonly hotRoomId: string;
  /** Rooms for the independent attempts; one per independent participant. */
  readonly independentRoomIds: readonly string[];
  readonly minDelayMs: number;
  readonly maxDelayMs: number;
  readonly random: () => number;
}

export interface PlannedAttempt {
  readonly participant: number;
  readonly target: 'hot' | 'independent';
  readonly roomId: string;
  readonly date: string;
  readonly slotId: string;
  readonly delayMs: number;
}

export type AttemptResult = 'success' | 'conflict' | 'error';

export interface ContentionReport {
  readonly attempts: number;
  readonly successes: number;
  readonly conflicts: number;
  readonly errors: number;
  readonly hotAttempts: number;
  readonly hotSuccesses: number;
  readonly independentAttempts: number;
  readonly independentSuccesses: number;
  /** Measured, not asserted: successes / attempts. */
  readonly successRate: number;
  readonly conflictRate: number;
}

/** Fisher–Yates on a copy, driven by the injected random source. */
function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = copy[i];
    const b = copy[j];
    if (a !== undefined && b !== undefined) {
      copy[i] = b;
      copy[j] = a;
    }
  }
  return copy;
}

export function planContention(options: ContentionPlanOptions): readonly PlannedAttempt[] {
  const { participants, hotShare, date, slotId, hotRoomId, independentRoomIds, random } = options;
  if (!Number.isInteger(participants) || participants < 2) {
    throw new Error('participants must be an integer ≥ 2');
  }
  const hotCount = Math.max(2, Math.round(participants * hotShare));
  const independentCount = participants - hotCount;
  if (independentRoomIds.length < independentCount) {
    throw new Error(`need ${independentCount} independent rooms, got ${independentRoomIds.length}`);
  }
  const hotParticipants = new Set(
    shuffled(
      Array.from({ length: participants }, (_, i) => i),
      random,
    ).slice(0, hotCount),
  );
  const delay = (): number =>
    Math.round(options.minDelayMs + random() * (options.maxDelayMs - options.minDelayMs));

  let nextIndependent = 0;
  return Array.from({ length: participants }, (_, participant): PlannedAttempt => {
    if (hotParticipants.has(participant)) {
      return { participant, target: 'hot', roomId: hotRoomId, date, slotId, delayMs: delay() };
    }
    const roomId = independentRoomIds[nextIndependent] ?? hotRoomId;
    nextIndependent += 1;
    return { participant, target: 'independent', roomId, date, slotId, delayMs: delay() };
  });
}

export function summarizeContention(
  plan: readonly PlannedAttempt[],
  results: readonly AttemptResult[],
): ContentionReport {
  let successes = 0;
  let conflicts = 0;
  let errors = 0;
  let hotAttempts = 0;
  let hotSuccesses = 0;
  let independentSuccesses = 0;
  plan.forEach((attempt, index) => {
    const result = results[index] ?? 'error';
    if (result === 'success') successes += 1;
    else if (result === 'conflict') conflicts += 1;
    else errors += 1;
    if (attempt.target === 'hot') {
      hotAttempts += 1;
      if (result === 'success') hotSuccesses += 1;
    } else if (result === 'success') {
      independentSuccesses += 1;
    }
  });
  const attempts = plan.length;
  return {
    attempts,
    successes,
    conflicts,
    errors,
    hotAttempts,
    hotSuccesses,
    independentAttempts: attempts - hotAttempts,
    independentSuccesses,
    successRate: attempts === 0 ? 0 : successes / attempts,
    conflictRate: attempts === 0 ? 0 : conflicts / attempts,
  };
}
