/**
 * Local mock room catalogue — EMERGENCY MVP only.
 *
 * This is NOT production server data. The production architecture reads rooms
 * from Firestore (PLAN.md TASK 10 seeds them, TASK 13 queries them); that track
 * is paused for the submission deadline. Until it resumes, this deterministic
 * generator is the room source, reached only through `src/services/room-repository.ts`.
 *
 * Deterministic on purpose: no `Math.random()`. Every launch produces the same
 * 120 rooms with the same ids, so the demo is reproducible and ids are stable.
 *
 * Layout: 4 buildings × 5 floors × 6 rooms = 120 rooms (30 per building).
 * Building V holds the computer labs, so every V room has a High-spec PC.
 */

import type { Building, Equipment, Room } from '@/types/room';

const BUILDINGS: readonly Building[] = ['A', 'B', 'C', 'V'];
const FLOORS_PER_BUILDING = 5;
const ROOMS_PER_FLOOR = 6;

/** Capacity steps, all within the 2–20 range. */
const CAPACITIES: readonly number[] = [2, 4, 6, 8, 10, 12, 15, 20];

/**
 * Equipment combinations for regular study rooms. Cycled deterministically so
 * every equipment type appears in every building.
 */
const STUDY_ROOM_EQUIPMENT: readonly (readonly Equipment[])[] = [
  ['Whiteboard'],
  ['Whiteboard', 'AC'],
  ['Projector', 'Whiteboard'],
  ['Projector', 'Whiteboard', 'AC'],
  ['AC'],
  ['Projector', 'AC'],
];

/** Computer labs (building V) always include a High-spec PC. */
const LAB_EQUIPMENT: readonly (readonly Equipment[])[] = [
  ['High-spec PC', 'AC'],
  ['High-spec PC', 'Projector', 'AC'],
  ['High-spec PC', 'Whiteboard', 'AC'],
  ['High-spec PC', 'Projector', 'Whiteboard', 'AC'],
];

function pick<T>(items: readonly T[], index: number): T {
  const item = items[index % items.length];
  if (item === undefined) {
    throw new Error('pick() called with an empty list');
  }
  return item;
}

function buildRooms(): readonly Room[] {
  const rooms: Room[] = [];
  let sequence = 0;

  for (const building of BUILDINGS) {
    for (let floor = 1; floor <= FLOORS_PER_BUILDING; floor += 1) {
      for (let unit = 1; unit <= ROOMS_PER_FLOOR; unit += 1) {
        const code = `${building}${floor}${String(unit).padStart(2, '0')}`;
        const isLab = building === 'V';

        rooms.push({
          id: `room-${code}`,
          name: isLab ? `Computer Lab ${code}` : `Study Room ${code}`,
          building,
          floor,
          capacity: pick(CAPACITIES, sequence * 3 + floor),
          // `unit + floor`, not `sequence + unit`: sequence advances in lockstep
          // with unit, so their sum is always odd and would only ever select
          // half of the combinations. Offsetting by floor cycles through all.
          equipment: pick(isLab ? LAB_EQUIPMENT : STUDY_ROOM_EQUIPMENT, unit + floor),
          image: `https://picsum.photos/seed/vku-${code}/240/240`,
        });
        sequence += 1;
      }
    }
  }

  return rooms;
}

/** The 120 mock rooms. Built once at module load. */
export const MOCK_ROOMS: readonly Room[] = buildRooms();
