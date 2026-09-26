import { useEffect, useState } from 'react';

import { cancelScheduledNotification, scheduleLocalReminder } from '@/services/local-notifications';
import { useBookingStore } from '@/store/useBookingStore';
import { planBookingReminder } from '@/utils/booking-reminder';

import type { Booking } from '@/types/booking';

export type ReminderStatus =
  | { readonly kind: 'pending' }
  | { readonly kind: 'scheduled'; readonly fireAt: Date }
  /** The reminder time (start − 15 min) has already passed, so nothing was scheduled. */
  | { readonly kind: 'too-late' }
  | { readonly kind: 'permission-denied' }
  /** Notifications cannot run here (e.g. a platform or Expo Go limitation). */
  | { readonly kind: 'unavailable' }
  /** The booking was cancelled before the reminder was set up. */
  | { readonly kind: 'booking-cancelled' };

const PENDING: ReminderStatus = { kind: 'pending' };

// One attempt per booking per app session: re-mounting the success screen (or
// React running an effect twice in development) reuses it, so a reminder is
// never scheduled twice and permission is never asked twice for one booking.
const attempts = new Map<string, Promise<ReminderStatus>>();

async function runReminderSetup(booking: Booking, now: Date): Promise<ReminderStatus> {
  const plan = planBookingReminder(booking, now);
  if (plan.kind === 'too-late') {
    return { kind: 'too-late' };
  }
  if (useBookingStore.getState().notificationIds[booking.id] !== undefined) {
    return { kind: 'scheduled', fireAt: plan.fireAt };
  }

  const result = await scheduleLocalReminder({
    ...plan.content,
    fireAt: plan.fireAt,
    data: { bookingId: booking.id },
  });
  if (result.kind !== 'scheduled') {
    return result;
  }

  // The permission prompt can stay open for a while; the booking may have been
  // cancelled meanwhile. Never keep a reminder for a cancelled booking.
  const current = useBookingStore.getState().bookings.find((item) => item.id === booking.id);
  if (current?.status !== 'confirmed') {
    await cancelScheduledNotification(result.notificationId);
    return { kind: 'booking-cancelled' };
  }
  useBookingStore.getState().setBookingNotificationId(booking.id, result.notificationId);
  return { kind: 'scheduled', fireAt: plan.fireAt };
}

/**
 * Schedules the local reminder for a confirmed booking at `startTime - 15 min`,
 * asking for notification permission if needed, and records the notification id
 * in the store. Skips the reminder when that time has already passed.
 * Never rejects.
 */
export function scheduleBookingReminder(
  booking: Booking,
  now: Date = new Date(),
): Promise<ReminderStatus> {
  const existing = attempts.get(booking.id);
  if (existing !== undefined) {
    return existing;
  }
  const attempt = runReminderSetup(booking, now).catch((): ReminderStatus => ({
    kind: 'unavailable',
  }));
  attempts.set(booking.id, attempt);
  return attempt;
}

/** Sets up the reminder for `booking` once, and reports how it went. */
export function useBookingReminder(booking: Booking | undefined): ReminderStatus {
  const [status, setStatus] = useState<ReminderStatus>(PENDING);
  const shouldSchedule = booking !== undefined && booking.status === 'confirmed';

  useEffect(() => {
    if (booking === undefined || !shouldSchedule) {
      return undefined;
    }
    let isActive = true;
    void scheduleBookingReminder(booking).then((next) => {
      if (isActive) {
        setStatus(next);
      }
    });
    return () => {
      isActive = false;
    };
  }, [booking, shouldSchedule]);

  return status;
}
