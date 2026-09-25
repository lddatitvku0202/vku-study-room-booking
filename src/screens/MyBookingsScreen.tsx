import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { spacing } from '@/data/theme';
import { useBookingStore } from '@/store/useBookingStore';

import type { JSX } from 'react';

/**
 * "My Bookings" tab. The full booking list arrives in a later MVP step; for now
 * it reports how many confirmed demo bookings are saved on this device, which
 * also makes persistence across restarts visible.
 */
export function MyBookingsScreen(): JSX.Element {
  const bookings = useBookingStore((state) => state.bookings);
  const confirmedCount = useMemo(
    () => bookings.filter((booking) => booking.status === 'confirmed').length,
    [bookings],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">My Bookings</AppText>
      </View>
      <EmptyState
        title={
          confirmedCount === 0
            ? 'No bookings yet'
            : `${confirmedCount} confirmed ${confirmedCount === 1 ? 'booking' : 'bookings'}`
        }
        message={
          confirmedCount === 0
            ? 'Rooms you book will appear here.'
            : 'Saved on this device. The full booking list is coming in the next step.'
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
});
