import { useCallback, useMemo } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { BookingPass } from '@/components/BookingPass';
import { ReminderNotice } from '@/components/ReminderNotice';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/data/theme';
import { useBookingReminder } from '@/hooks/useBookingReminder';
import { useBookingStore } from '@/store/useBookingStore';
import { buildBookingPassPayload } from '@/utils/booking-pass';

import type { RootStackScreenProps } from '@/navigation/types';
import type { JSX } from 'react';

const SCREEN_EDGES = ['left', 'right', 'bottom'] as const;
const MARK_SIZE = 72;

interface DetailRowProps {
  readonly label: string;
  readonly value: string;
}

function DetailRow({ label, value }: DetailRowProps): JSX.Element {
  return (
    <View style={styles.row}>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
      <AppText style={styles.value} selectable>
        {value}
      </AppText>
    </View>
  );
}

function openAppSettings(): void {
  Linking.openSettings().catch(() => {
    // Nothing more to do: the notice already explains how to enable reminders.
  });
}

/**
 * Shown after a booking is saved. Receives only `bookingId`, reads the booking
 * from the local demo store, shows the QR booking pass, and sets up the local
 * reminder (start − 15 min).
 */
export function BookingSuccessScreen({
  route,
  navigation,
}: RootStackScreenProps<'BookingSuccess'>): JSX.Element {
  const { bookingId } = route.params;
  const booking = useBookingStore((state) => state.bookings.find((b) => b.id === bookingId));
  const reminder = useBookingReminder(booking);
  const passPayload = useMemo(
    () => (booking === undefined ? '' : buildBookingPassPayload(booking)),
    [booking],
  );

  const backToRooms = useCallback(() => {
    navigation.popToTop();
  }, [navigation]);
  const viewMyBookings = useCallback(() => {
    navigation.popTo('MainTabs', { screen: 'MyBookings' });
  }, [navigation]);

  if (booking === undefined) {
    return (
      <Screen edges={SCREEN_EDGES}>
        <EmptyState
          icon="🔍"
          title="Booking not found"
          message={`No saved booking has the id "${bookingId}".`}
          actionLabel="Back to rooms"
          onAction={backToRooms}
        />
      </Screen>
    );
  }

  const isConfirmed = booking.status === 'confirmed';

  return (
    <Screen edges={SCREEN_EDGES}>
      <ScrollView contentContainerStyle={styles.content}>
        <FadeIn style={styles.hero}>
          <View
            style={[styles.mark, !isConfirmed && styles.markCancelled]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            <AppText style={styles.markGlyph} color="surface">
              {isConfirmed ? '✓' : '✕'}
            </AppText>
          </View>
          <AppText variant="title" style={styles.centered}>
            {isConfirmed ? 'Booking confirmed' : 'Booking cancelled'}
          </AppText>
          <Badge
            label={isConfirmed ? 'Confirmed' : 'Cancelled'}
            tone={isConfirmed ? 'success' : 'neutral'}
          />
        </FadeIn>

        <BookingPass payload={passPayload} />

        <Card style={styles.card}>
          <DetailRow label="Booking ID" value={booking.id} />
          <DetailRow label="Room" value={`${booking.roomName} · Building ${booking.building}`} />
          <DetailRow label="Date" value={booking.date} />
          <DetailRow label="Time slot" value={booking.slotLabel} />
        </Card>

        {isConfirmed && <ReminderNotice status={reminder} onOpenSettings={openAppSettings} />}

        <AppText variant="caption" color="textSecondary" style={styles.centered}>
          Demo booking saved on this device only — it is not synchronized with other users. The QR
          pass is for display; nothing scans it.
        </AppText>

        <View style={styles.actions}>
          <AppButton label="View my bookings" onPress={viewMyBookings} />
          <AppButton label="Back to rooms" variant="secondary" onPress={backToRooms} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  mark: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    borderRadius: MARK_SIZE / 2,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markCancelled: {
    backgroundColor: colors.disabled,
  },
  markGlyph: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
  },
  centered: {
    textAlign: 'center',
  },
  card: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.xs / 2,
  },
  value: {
    fontWeight: '600',
  },
  actions: {
    gap: spacing.sm,
  },
});
