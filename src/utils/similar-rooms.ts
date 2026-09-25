/**
 * Simple similar-room suggestions, used after a demo conflict when the same room
 * has no other free slot on the chosen date.
 *
 * A candidate must share at least one piece of equipment and be within
 * `MAX_CAPACITY_GAP` seats. Candidates are ranked by: same building (+3), each
 * shared piece of equipment (+1), and a small penalty per seat of difference.
 */

import type { Room } from '@/types/room';

const MAX_CAPACITY_GAP = 6;
const SAME_BUILDING_BONUS = 3;
const CAPACITY_GAP_WEIGHT = 0.25;

export function findSimilarRooms(
  target: Room,
  rooms: readonly Room[],
  isUnavailable: (room: Room) => boolean,
  limit: number = 3,
): readonly Room[] {
  return rooms
    .filter((room) => room.id !== target.id && !isUnavailable(room))
    .map((room) => {
      const shared = room.equipment.filter((item) => target.equipment.includes(item)).length;
      const capacityGap = Math.abs(room.capacity - target.capacity);
      const score =
        (room.building === target.building ? SAME_BUILDING_BONUS : 0) +
        shared -
        capacityGap * CAPACITY_GAP_WEIGHT;
      return { room, shared, capacityGap, score };
    })
    .filter(({ shared, capacityGap }) => shared > 0 && capacityGap <= MAX_CAPACITY_GAP)
    .sort((a, b) => b.score - a.score || a.room.name.localeCompare(b.room.name))
    .slice(0, limit)
    .map(({ room }) => room);
}
