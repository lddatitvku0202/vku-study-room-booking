/**
 * Pure rules for the local booking reminder: when it fires and what it says.
 * The current time is passed in, never read here.
 */

import { format, isBefore, isValid, subMinutes } from 'date-fns';

import { parseDateTime } from '@/utils/booking-dates';

import type { Booking } from '@/types/booking';

/** The reminder fires this many minutes before the booked slot starts. */
export const REMINDER_LEAD_MINUTES = 15;
export const REMINDER_TITLE = 'Nhắc lịch đặt phòng';

export interface ReminderContent {
  readonly title: string;
  readonly body: string;
}

export type ReminderPlan =
  | { readonly kind: 'schedule'; readonly fireAt: Date; readonly content: ReminderContent }
  /** The reminder time has already passed (or the booking time is unreadable). */
  | { readonly kind: 'too-late' };

/** `startTime - 15 minutes` on the booking's date, or an invalid Date for bad input. */
export function getReminderTime(date: string, startTime: string): Date {
  return subMinutes(parseDateTime(date, startTime), REMINDER_LEAD_MINUTES);
}

export function buildReminderBody(roomName: string, startTime: string): string {
  return `Sắp đến giờ sử dụng phòng ${roomName} lúc ${startTime}`;
}

/** Whether to schedule a reminder for `booking` at `now`, and with what content. */
export function planBookingReminder(booking: Booking, now: Date): ReminderPlan {
  const fireAt = getReminderTime(booking.date, booking.startTime);
  if (!isValid(fireAt) || !isBefore(now, fireAt)) {
    return { kind: 'too-late' };
  }
  return {
    kind: 'schedule',
    fireAt,
    content: {
      title: REMINDER_TITLE,
      body: buildReminderBody(booking.roomName, booking.startTime),
    },
  };
}

/** "07:15 on 2026-09-28" — how the reminder time is shown to the user. */
export function formatReminderTime(fireAt: Date): string {
  return format(fireAt, "HH:mm 'on' yyyy-MM-dd");
}
