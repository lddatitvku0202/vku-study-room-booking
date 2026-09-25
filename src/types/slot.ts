/**
 * Time slot domain types.
 *
 * Slots are a fixed, closed set defined in `src/data/time-slots.ts`.
 * Users pick a slot; they never enter an arbitrary time.
 */

/**
 * One bookable period within a day.
 *
 * `start` and `end` are 24-hour `HH:mm` strings in the single campus timezone
 * (see CLAUDE.md — dates are `yyyy-MM-dd`, times come from the slot definition).
 */
export interface TimeSlot {
  readonly id: string;
  readonly label: string;
  readonly start: string;
  readonly end: string;
}
