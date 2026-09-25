import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { spacing } from '@/data/theme';
import { useBookingStore } from '@/store/useBookingStore';

import type { RootStackScreenProps } from '@/navigation/types';
import type { JSX } from 'react';

const SCREEN_EDGES = ['left', 'right', 'bottom'] as const;

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
      <AppText style={styles.value}>{value}</AppText>
    </View>
  );
}

/**
 * Shown after a booking is saved. Receives only `bookingId` and reads the
 * booking from the local demo store.
 */
export function BookingSuccessScreen({
  route,
  navigation,
}: RootStackScreenProps<'BookingSuccess'>): JSX.Element {
  const { bookingId } = route.params;
  const booking = useBookingStore((state) => state.bookings.find((b) => b.id === bookingId));

  const handleDone = useCallback(() => {
    navigation.popToTop();
  }, [navigation]);

  if (booking === undefined) {
    return (
      <Screen edges={SCREEN_EDGES}>
        <EmptyState
          title="Booking not found"
          message={`No saved booking has the id "${bookingId}".`}
          actionLabel="Back to rooms"
          onAction={handleDone}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={SCREEN_EDGES}>
      <View style={styles.content}>
        <AppText variant="title">Booking confirmed</AppText>
        <Badge label="Confirmed" tone="success" />

        <Card style={styles.card}>
          <DetailRow label="Room" value={booking.roomName} />
          <DetailRow label="Building" value={booking.building} />
          <DetailRow label="Date" value={booking.date} />
          <DetailRow label="Time" value={booking.slotLabel} />
          <DetailRow label="Booking ID" value={booking.id} />
        </Card>

        <AppText variant="caption" color="textSecondary">
          Demo booking saved on this device only — it is not synchronized with other users.
        </AppText>

        <AppButton label="Back to rooms" onPress={handleDone} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
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
});
