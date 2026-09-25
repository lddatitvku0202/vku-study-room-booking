/**
 * Room data access — the single way the app obtains rooms.
 *
 * EMERGENCY MVP: returns the local mock catalogue from `src/data/rooms.ts`.
 * No Firebase, no network, no API — and it does not pretend otherwise (no fake
 * latency). Production swaps this implementation for a Firestore read (PLAN.md
 * TASK 12/13) without touching the hook or the screen, which is the point of
 * keeping the abstraction.
 */

import { MOCK_ROOMS } from '@/data/rooms';

import type { Room } from '@/types/room';

export async function fetchRooms(): Promise<readonly Room[]> {
  return MOCK_ROOMS;
}
