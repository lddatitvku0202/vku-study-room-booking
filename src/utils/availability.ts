/**
 * Pure availability rules over slot locks (26R). No React, no Firebase.
 *
 * Status is always *derived* from active locks, never stored on a room (AD-32):
 * "Occupied" means a booked slot of that room covers the current time. This is
 * booking-based availability, not physical sensor occupancy.
 */

import { isBefore } from 'date-fns';

import { parseDateTime } from '@/utils/booking-dates';
import { findTimeSlot } from '@/utils/domain-guards';

import type { SlotLock } from '@/types/booking';
import type { RoomStatus } from '@/types/room';

export interface LockPartition {
  /** Slot keys locked by the signed-in user. */
  readonly mine: ReadonlySet<string>;
  /** Slot keys locked by anyone else. */
  readonly others: ReadonlySet<string>;
}

/** Splits locks into the caller's own and everyone else's. */
export function partitionLocks(locks: readonly SlotLock[], uid: string | undefined): LockPartition {
  const mine = new Set<string>();
  const others = new Set<string>();
  for (const lock of locks) {
    (uid !== undefined && lock.userId === uid ? mine : others).add(lock.slotKey);
  }
  return { mine, others };
}

/** True when the lock's slot is in progress at `now` (start inclusive, end exclusive). */
export function isLockActiveAt(lock: SlotLock, now: Date): boolean {
  const slot = findTimeSlot(lock.slotId);
  if (slot === undefined) {
    return false;
  }
  const start = parseDateTime(lock.date, slot.start);
  const end = parseDateTime(lock.date, slot.end);
  return !isBefore(now, start) && isBefore(now, end);
}

/** Room id → status, for every room that has an in-progress booking at `now`. */
export function occupiedRoomIds(locks: readonly SlotLock[], now: Date): ReadonlySet<string> {
  const occupied = new Set<string>();
  for (const lock of locks) {
    if (isLockActiveAt(lock, now)) occupied.add(lock.roomId);
  }
  return occupied;
}

export function deriveRoomStatus(roomId: string, occupied: ReadonlySet<string>): RoomStatus {
  return occupied.has(roomId) ? 'occupied' : 'available';
}
