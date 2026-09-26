import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/data/theme';
import { formatReminderTime, REMINDER_LEAD_MINUTES } from '@/utils/booking-reminder';

import type { ColorToken } from '@/data/theme';
import type { ReminderStatus } from '@/hooks/useBookingReminder';
import type { JSX } from 'react';

export interface ReminderNoticeProps {
  readonly status: ReminderStatus;
  /** Shown as "Open Settings" when notification permission was denied. */
  readonly onOpenSettings: () => void;
}

function describe(status: ReminderStatus): { text: string; color: ColorToken } {
  switch (status.kind) {
    case 'pending':
      return { text: 'Setting up your reminder…', color: 'textSecondary' };
    case 'scheduled':
      return {
        text: `Reminder set for ${formatReminderTime(status.fireAt)}, ${REMINDER_LEAD_MINUTES} minutes before your slot.`,
        color: 'success',
      };
    case 'too-late':
      return {
        text: `No reminder: your slot starts in less than ${REMINDER_LEAD_MINUTES} minutes.`,
        color: 'textSecondary',
      };
    case 'permission-denied':
      return {
        text: 'Notifications are off, so no reminder was set. Your booking is saved. You can allow notifications in Settings.',
        color: 'warning',
      };
    case 'unavailable':
      return {
        text: 'Reminders are not available here (for example in Expo Go on Android). Your booking is saved.',
        color: 'warning',
      };
    case 'booking-cancelled':
      return { text: 'This booking was cancelled, so no reminder is set.', color: 'textSecondary' };
  }
}

/** How the booking's local reminder went. Never blocks the booking itself. */
export function ReminderNotice({ status, onOpenSettings }: ReminderNoticeProps): JSX.Element {
  const { text, color } = describe(status);

  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <View style={styles.row}>
        {status.kind === 'pending' && <ActivityIndicator size="small" color={colors.primary} />}
        <AppText variant="caption" color={color} style={styles.text}>
          {text}
        </AppText>
      </View>
      {status.kind === 'permission-denied' && (
        <AppButton label="Open Settings" variant="secondary" onPress={onOpenSettings} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: {
    flex: 1,
    fontWeight: '600',
  },
});
