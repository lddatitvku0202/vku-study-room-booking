/**
 * The fixed bookable time slots.
 *
 * This is a closed set: a user picks one of these four slots and can never
 * enter an arbitrary time. The slot `id` is part of the slot lock document key
 * (`roomId_date_slotId`), so these ids are persisted data — changing one
 * invalidates existing bookings and must be treated as a data migration.
 */

import type { TimeSlot } from '@/types/slot';

export const TIME_SLOTS = [
  { id: '07:30-09:30', label: '07:30 - 09:30', start: '07:30', end: '09:30' },
  { id: '09:30-11:30', label: '09:30 - 11:30', start: '09:30', end: '11:30' },
  { id: '13:00-15:00', label: '13:00 - 15:00', start: '13:00', end: '15:00' },
  { id: '15:00-17:00', label: '15:00 - 17:00', start: '15:00', end: '17:00' },
] as const satisfies readonly TimeSlot[];

/** Union of the four valid slot ids, derived from the definition above. */
export type SlotId = (typeof TIME_SLOTS)[number]['id'];
