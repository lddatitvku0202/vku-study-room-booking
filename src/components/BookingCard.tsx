import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { spacing } from '@/data/theme';

import type { Booking } from '@/types/booking';

export interface BookingCardProps {
  readonly booking: Booking;
  /** Called with the booking when "Cancel booking" is pressed (confirmed bookings only). */
  readonly onCancel: (booking: Booking) => void;
}

/** One saved booking. Only a confirmed booking shows the cancel action. */
export const BookingCard = memo(function BookingCard({ booking, onCancel }: BookingCardProps) {
  const isConfirmed = booking.status === 'confirmed';
  const handleCancel = useCallback(() => {
    onCancel(booking);
  }, [onCancel, booking]);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <AppText variant="heading" numberOfLines={1} style={styles.name}>
          {booking.roomName}
        </AppText>
        <Badge
          label={isConfirmed ? 'Confirmed' : 'Cancelled'}
          tone={isConfirmed ? 'success' : 'neutral'}
        />
      </View>
      <AppText color="textSecondary">Building {booking.building}</AppText>
      <AppText>
        {booking.date} · {booking.slotLabel}
      </AppText>
      <AppText variant="caption" color="textSecondary" numberOfLines={1}>
        Booking ID: {booking.id}
      </AppText>
      {isConfirmed && (
        <View style={styles.action}>
          <AppButton label="Cancel booking" variant="secondary" onPress={handleCancel} />
        </View>
      )}
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
  },
  action: {
    marginTop: spacing.sm,
  },
});
