import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';

import { BookingCard } from '@/components/BookingCard';
import { FilterChip } from '@/components/FilterChip';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/data/theme';
import { useCancelBooking } from '@/hooks/useCancelBooking';
import { useBookingStore, useBookingStoreHydrated } from '@/store/useBookingStore';
import { countBookingsByStatus, getBookingsByStatus } from '@/utils/booking-list';

import type { MainTabScreenProps } from '@/navigation/types';
import type { Booking, BookingStatus } from '@/types/booking';
import type { JSX } from 'react';
import type { ListRenderItem } from 'react-native';

const STATUS_LABELS: Record<BookingStatus, string> = {
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};

const EMPTY_FILTER_MESSAGES: Record<BookingStatus, { title: string; message: string }> = {
  confirmed: {
    title: 'No confirmed bookings',
    message: 'Book a room from Browse Rooms and it will appear here.',
  },
  cancelled: {
    title: 'No cancelled bookings',
    message: 'Bookings you cancel stay here as history.',
  },
};

function keyExtractor(booking: Booking): string {
  return booking.id;
}

function ItemSeparator(): JSX.Element {
  return <View style={styles.separator} />;
}

/**
 * "My Bookings" tab: the demo bookings saved on this device, filtered by status.
 * Confirmed bookings can be cancelled; a cancelled booking stays as history and
 * its slot becomes bookable again.
 */
export function MyBookingsScreen({ navigation }: MainTabScreenProps<'MyBookings'>): JSX.Element {
  const bookings = useBookingStore((state) => state.bookings);
  const isHydrated = useBookingStoreHydrated();
  const cancelBooking = useCancelBooking();
  const [statusFilter, setStatusFilter] = useState<BookingStatus>('confirmed');

  const counts = useMemo(() => countBookingsByStatus(bookings), [bookings]);
  const visibleBookings = useMemo(
    () => getBookingsByStatus(bookings, statusFilter),
    [bookings, statusFilter],
  );

  const showConfirmed = useCallback(() => {
    setStatusFilter('confirmed');
  }, []);
  const showCancelled = useCallback(() => {
    setStatusFilter('cancelled');
  }, []);
  const browseRooms = useCallback(() => {
    navigation.navigate('BrowseRooms');
  }, [navigation]);

  const confirmCancel = useCallback(
    (booking: Booking) => {
      Alert.alert(
        'Cancel this booking?',
        `${booking.roomName}\n${booking.date} · ${booking.slotLabel}\n\n` +
          'The time slot becomes available again. The booking stays in your history as cancelled.',
        [
          { text: 'Keep booking', style: 'cancel' },
          {
            text: 'Cancel booking',
            style: 'destructive',
            onPress: () => {
              cancelBooking(booking.id);
            },
          },
        ],
      );
    },
    [cancelBooking],
  );

  const renderItem = useCallback<ListRenderItem<Booking>>(
    ({ item }) => <BookingCard booking={item} onCancel={confirmCancel} />,
    [confirmCancel],
  );

  if (!isHydrated) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <AppText color="textSecondary">Loading your bookings…</AppText>
        </View>
      </Screen>
    );
  }

  if (bookings.length === 0) {
    return (
      <Screen>
        <View style={styles.header}>
          <AppText variant="title">My Bookings</AppText>
        </View>
        <EmptyState
          title="Bạn chưa có lịch đặt phòng"
          message="Rooms you book will appear here."
          actionLabel="Browse rooms"
          onAction={browseRooms}
        />
      </Screen>
    );
  }

  const emptyFilter = EMPTY_FILTER_MESSAGES[statusFilter];

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">My Bookings</AppText>
        <AppText variant="caption" color="textSecondary">
          Demo bookings saved on this device only — not synchronized with other users.
        </AppText>
        <View style={styles.filters}>
          <FilterChip
            label={`${STATUS_LABELS.confirmed} (${counts.confirmed})`}
            selected={statusFilter === 'confirmed'}
            onPress={showConfirmed}
          />
          <FilterChip
            label={`${STATUS_LABELS.cancelled} (${counts.cancelled})`}
            selected={statusFilter === 'cancelled'}
            onPress={showCancelled}
          />
        </View>
      </View>
      <FlatList
        data={visibleBookings}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={ItemSeparator}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState title={emptyFilter.title} message={emptyFilter.message} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  list: {
    flexGrow: 1,
    padding: spacing.md,
  },
  separator: {
    height: spacing.md,
  },
});
