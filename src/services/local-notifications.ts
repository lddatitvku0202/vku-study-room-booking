/**
 * Local notification access — EMERGENCY MVP seam.
 *
 * No notification library is installed yet: `expo-notifications`, permissions and
 * booking reminders belong to production TASK 38/39. Until then the app schedules
 * nothing, so no booking ever has a notification id and this function is never
 * reached in practice. It exists so the cancel flow already has the right shape:
 * when reminders arrive, only this file changes.
 *
 * It never claims a cancellation it did not perform — it reports 'unavailable'.
 */

export type NotificationCancelResult = 'cancelled' | 'unavailable';

/** Cancels a scheduled local notification by the id returned when it was scheduled. */
export async function cancelScheduledNotification(
  _notificationId: string,
): Promise<NotificationCancelResult> {
  return 'unavailable';
}
