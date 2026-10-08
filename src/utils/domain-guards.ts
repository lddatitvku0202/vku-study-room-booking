/**
 * Runtime type guards for the closed domain vocabularies. Pure.
 *
 * Data from outside the app (device storage, Firestore) is checked with these
 * and narrowed — never cast (CLAUDE.md §11).
 */

import { TIME_SLOTS } from '@/data/time-slots';

import type { SlotId } from '@/data/time-slots';
import type { BookingStatus } from '@/types/booking';
import type { Building, Equipment } from '@/types/room';
import type { TimeSlot } from '@/types/slot';

const BUILDINGS = ['A', 'B', 'C', 'V'] as const satisfies readonly Building[];
const EQUIPMENT = [
  'Projector',
  'Whiteboard',
  'High-spec PC',
  'AC',
] as const satisfies readonly Equipment[];
const STATUSES = ['confirmed', 'cancelled'] as const satisfies readonly BookingStatus[];
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isBuilding(value: unknown): value is Building {
  return typeof value === 'string' && (BUILDINGS as readonly string[]).includes(value);
}

export function isEquipment(value: unknown): value is Equipment {
  return typeof value === 'string' && (EQUIPMENT as readonly string[]).includes(value);
}

export function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value);
}

/** The fixed time slot with this id, if it is one of the four. */
export function findTimeSlot(slotId: unknown): (TimeSlot & { readonly id: SlotId }) | undefined {
  return TIME_SLOTS.find((slot) => slot.id === slotId);
}

/** `yyyy-MM-dd` shape check (calendar validity is checked by the date helpers). */
export function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && DATE_KEY_PATTERN.test(value);
}
