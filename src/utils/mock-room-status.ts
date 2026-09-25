/**
 * Mock "available / occupied" status — EMERGENCY MVP only.
 *
 * NOT real availability. There are no bookings or slot locks in the MVP, so
 * this returns a stable, deterministic placeholder per room id purely so the
 * status badge can be demonstrated. Production replaces it with
 * `deriveRoomStatus()` over active slot locks (PLAN.md TASK 19).
 *
 * Pure: same id → same status on every launch. Roughly one room in three is
 * reported occupied.
 */

import type { RoomStatus } from '@/types/room';

export function getMockRoomStatus(roomId: string): RoomStatus {
  let hash = 0;
  for (let i = 0; i < roomId.length; i += 1) {
    hash = (hash * 31 + roomId.charCodeAt(i)) % 1_000_003;
  }
  return hash % 3 === 0 ? 'occupied' : 'available';
}
