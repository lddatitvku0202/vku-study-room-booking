/**
 * Pure date and time-slot helpers for the booking picker.
 *
 * Dates are `yyyy-MM-dd` strings; slot times come from the fixed `TIME_SLOTS`
 * definition. Times are interpreted in the device's local timezone — the MVP
 * assumes the device is on campus time.
 *
 * No React, no I/O. The current time is always passed in, never read here, so
 * every function is deterministic and testable.
 */

import { addDays, format, isBefore, isValid, parse } from 'date-fns';

import type { TimeSlot } from '@/types/slot';

export const DATE_KEY_FORMAT = 'yyyy-MM-dd';
/** How many days ahead, including today, a room can be booked. */
export const BOOKING_WINDOW_DAYS = 7;

const DATE_TIME_FORMAT = `${DATE_KEY_FORMAT} HH:mm`;
// Reference date for `parse`; irrelevant because the inputs are fully specified.
const REFERENCE_DATE = new Date(0);

export interface BookableDate {
  /** `yyyy-MM-dd`. */
  readonly key: string;
  /** Short weekday, e.g. "Mon". */
  readonly weekday: string;
  readonly isToday: boolean;
}

export function toDateKey(date: Date): string {
  return format(date, DATE_KEY_FORMAT);
}

/** `count` consecutive days starting at `todayKey`. */
export function getBookableDates(
  todayKey: string,
  count: number = BOOKING_WINDOW_DAYS,
): readonly BookableDate[] {
  const start = parse(todayKey, DATE_KEY_FORMAT, REFERENCE_DATE);
  if (!isValid(start)) {
    return [];
  }
  return Array.from({ length: count }, (_, offset) => {
    const day = addDays(start, offset);
    return { key: toDateKey(day), weekday: format(day, 'EEE'), isToday: offset === 0 };
  });
}

/** A `yyyy-MM-dd` date plus an `HH:mm` time as a local Date, or an invalid Date for bad input. */
export function parseDateTime(dateKey: string, time: string): Date {
  return parse(`${dateKey} ${time}`, DATE_TIME_FORMAT, REFERENCE_DATE);
}

/** The moment a slot starts on a given date, or an invalid Date for bad input. */
export function getSlotStart(dateKey: string, slot: TimeSlot): Date {
  return parseDateTime(dateKey, slot.start);
}

/**
 * True once a slot has started. A slot that is already under way cannot be
 * booked. Unparseable input counts as past, so it can never be selected.
 */
export function isSlotPast(dateKey: string, slot: TimeSlot, now: Date): boolean {
  const start = getSlotStart(dateKey, slot);
  return !isValid(start) || !isBefore(now, start);
}
