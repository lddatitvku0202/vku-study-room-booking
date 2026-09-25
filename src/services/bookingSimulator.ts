/**
 * DEMO CONFLICT SIMULATOR — for the emergency submission MVP only.
 *
 * This is NOT concurrency control and NOT a multi-user conflict. There is no
 * server and no other user: after a random 1000–1500 ms delay (Promise +
 * setTimeout), about 70% of attempts succeed and about 30% are *simulated*
 * conflicts, chosen by `Math.random()`. It exists only to demonstrate the
 * loading, success and conflict screens.
 *
 * Production replaces this with a Firestore `runTransaction()` whose outcome is
 * decided by the server (CLAUDE.md §6). CLAUDE.md §10 forbids random outcomes
 * there; this module is a deliberate, documented MVP exception and must not be
 * reused as a conflict engine.
 */

import { buildSlotKey } from '@/utils/slot-key';

import type { Booking } from '@/types/booking';
import type { Room } from '@/types/room';
import type { TimeSlot } from '@/types/slot';

export const DEMO_USER_ID = 'demo-user';
/** Share of attempts that succeed; the rest are simulated conflicts. */
export const DEMO_SUCCESS_RATE = 0.7;
export const DEMO_MIN_DELAY_MS = 1000;
export const DEMO_MAX_DELAY_MS = 1500;

export interface DemoReservationRequest {
  /** Generated once per attempt by the caller. */
  readonly bookingId: string;
  readonly room: Room;
  /** `yyyy-MM-dd`. */
  readonly date: string;
  readonly slot: TimeSlot;
}

export type DemoReservationResult =
  | { readonly kind: 'success'; readonly booking: Booking; readonly delayMs: number }
  | { readonly kind: 'conflict'; readonly slotKey: string; readonly delayMs: number };

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** A unique-enough id for a local demo booking. */
export function createDemoBookingId(): string {
  return `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Simulated reservation. Resolves after 1000–1500 ms with either the created
 * booking (~70%) or a simulated conflict (~30%). Never rejects.
 */
export async function reserveRoomDemo(
  request: DemoReservationRequest,
): Promise<DemoReservationResult> {
  const delayMs = Math.round(
    DEMO_MIN_DELAY_MS + Math.random() * (DEMO_MAX_DELAY_MS - DEMO_MIN_DELAY_MS),
  );
  await wait(delayMs);

  const { bookingId, room, date, slot } = request;

  if (Math.random() >= DEMO_SUCCESS_RATE) {
    return { kind: 'conflict', slotKey: buildSlotKey(room.id, date, slot.id), delayMs };
  }

  return {
    kind: 'success',
    delayMs,
    booking: {
      id: bookingId,
      userId: DEMO_USER_ID,
      roomId: room.id,
      roomName: room.name,
      building: room.building,
      date,
      slotId: slot.id,
      slotLabel: slot.label,
      startTime: slot.start,
      endTime: slot.end,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    },
  };
}
