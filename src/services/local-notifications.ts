/**
 * Local notifications (booking reminders) through `expo-notifications`.
 * Local only: no push service, no push token, no server-side sender.
 *
 * Every function here resolves — none throws to the caller. A reminder is a
 * convenience; a notification failure must never break or undo a booking.
 *
 * The module is loaded lazily, on first use, and guarded. In Expo Go on
 * Android, `expo-notifications` sets up push-token handling when it is first
 * imported, and that code throws there (remote push was removed from Expo Go in
 * SDK 53). A static import would crash the app at startup; a guarded dynamic
 * import turns the failure into "reminders unavailable" instead.
 */

import { Platform } from 'react-native';

import type * as ExpoNotifications from 'expo-notifications';

type NotificationsModule = typeof ExpoNotifications;
type PermissionResponse = Awaited<ReturnType<NotificationsModule['getPermissionsAsync']>>;

export const REMINDER_CHANNEL_ID = 'booking-reminders';

export type NotificationPermission = 'granted' | 'denied' | 'unavailable';

export interface LocalReminderRequest {
  readonly title: string;
  readonly body: string;
  readonly fireAt: Date;
  readonly data: Readonly<Record<string, string>>;
}

export type ScheduleReminderResult =
  | { readonly kind: 'scheduled'; readonly notificationId: string }
  | { readonly kind: 'permission-denied' }
  | { readonly kind: 'unavailable' };

export type NotificationCancelResult = 'cancelled' | 'unavailable';

let modulePromise: Promise<NotificationsModule | null> | undefined;

function warn(message: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[notifications] ${message}`, error);
  }
}

async function setUp(notifications: NotificationsModule): Promise<NotificationsModule> {
  // Show a reminder even when the app is open.
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    // Android 13+ shows the permission prompt only once a channel exists.
    try {
      await notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: 'Booking reminders',
        importance: notifications.AndroidImportance.HIGH,
      });
    } catch (error: unknown) {
      warn('could not create the reminder channel', error);
    }
  }
  return notifications;
}

/** The notifications module, or `null` when it cannot run here. Loaded once. */
function loadNotifications(): Promise<NotificationsModule | null> {
  modulePromise ??= import('expo-notifications').then(setUp).catch((error: unknown) => {
    warn('local notifications are unavailable in this environment', error);
    return null;
  });
  return modulePromise;
}

/**
 * Loads and configures notifications at app start, without asking for
 * permission, so a reminder that fires while the app is open is still shown.
 */
export async function initializeNotifications(): Promise<boolean> {
  return (await loadNotifications()) !== null;
}

function isAllowed(notifications: NotificationsModule, response: PermissionResponse): boolean {
  return (
    response.granted || response.ios?.status === notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

/** Asks for notification permission only if it has not been decided yet. */
export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  const notifications = await loadNotifications();
  if (notifications === null) {
    return 'unavailable';
  }
  try {
    const current = await notifications.getPermissionsAsync();
    if (isAllowed(notifications, current)) {
      return 'granted';
    }
    if (!current.canAskAgain) {
      return 'denied';
    }
    const requested = await notifications.requestPermissionsAsync();
    return isAllowed(notifications, requested) ? 'granted' : 'denied';
  } catch (error: unknown) {
    warn('could not read or request notification permission', error);
    return 'unavailable';
  }
}

/** Schedules one local notification at `fireAt`, asking for permission if needed. */
export async function scheduleLocalReminder(
  request: LocalReminderRequest,
): Promise<ScheduleReminderResult> {
  const permission = await ensureNotificationPermission();
  if (permission === 'denied') {
    return { kind: 'permission-denied' };
  }
  const notifications = await loadNotifications();
  if (permission === 'unavailable' || notifications === null) {
    return { kind: 'unavailable' };
  }
  try {
    const notificationId = await notifications.scheduleNotificationAsync({
      content: { title: request.title, body: request.body, data: { ...request.data } },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DATE,
        date: request.fireAt,
        channelId: REMINDER_CHANNEL_ID,
      },
    });
    return { kind: 'scheduled', notificationId };
  } catch (error: unknown) {
    warn('could not schedule the reminder', error);
    return { kind: 'unavailable' };
  }
}

/** Cancels a scheduled local notification by the id returned when it was scheduled. */
export async function cancelScheduledNotification(
  notificationId: string,
): Promise<NotificationCancelResult> {
  const notifications = await loadNotifications();
  if (notifications === null) {
    return 'unavailable';
  }
  try {
    await notifications.cancelScheduledNotificationAsync(notificationId);
    return 'cancelled';
  } catch (error: unknown) {
    warn('could not cancel the reminder', error);
    return 'unavailable';
  }
}
