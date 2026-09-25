import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
  type ListRenderItem,
} from 'react-native';

import { DateChip } from '@/components/DateChip';
import { FilterChip } from '@/components/FilterChip';
import { getRoomStatusLabel } from '@/components/RoomCard';
import { SlotCard, type SlotCardState } from '@/components/SlotCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radius, spacing } from '@/data/theme';
import { TIME_SLOTS, type SlotId } from '@/data/time-slots';
import { useRoom, useRooms } from '@/hooks/use-rooms';
import { useNow } from '@/hooks/useNow';
import { createDemoBookingId, reserveRoomDemo } from '@/services/bookingSimulator';
import { useBookingStore, useBookingStoreHydrated } from '@/store/useBookingStore';
import { getBookableDates, isSlotPast, toDateKey, type BookableDate } from '@/utils/booking-dates';
import { findConfirmedBooking, getConfirmedSlotKeys } from '@/utils/booking-rules';
import { getMockRoomStatus } from '@/utils/mock-room-status';
import { findSimilarRooms } from '@/utils/similar-rooms';
import { buildSlotKey } from '@/utils/slot-key';

import type { RootStackScreenProps } from '@/navigation/types';
import type { Room } from '@/types/room';
import type { JSX } from 'react';

type FixedSlot = (typeof TIME_SLOTS)[number];

interface SlotItem {
  readonly slot: FixedSlot;
  readonly state: SlotCardState;
}

/** The slot that just produced a (simulated) conflict, and on which date. */
interface ConflictContext {
  readonly date: string;
  readonly slotId: SlotId;
}

const CONFLICT_TITLE = 'Đặt phòng không thành công';
const CONFLICT_MESSAGE = 'Rất tiếc, phòng này vừa được người khác đặt thành công.';

// The native header already pads the top; the bottom inset belongs to the action bar.
const SCREEN_EDGES = ['left', 'right', 'bottom'] as const;
const NO_ROOMS: readonly Room[] = [];

function dateKeyOf(date: BookableDate): string {
  return date.key;
}

function slotKeyOf(item: SlotItem): string {
  return item.slot.id;
}

/**
 * Room details, date and slot selection, and the local demo booking flow.
 *
 * Booking: "Đặt phòng" → local checks (slot not started, not already booked) →
 * `reserveRoomDemo` (1–1.5 s, ~70% success / ~30% simulated conflict) → on success
 * the booking is saved through the store and only then does the app navigate to
 * BookingSuccess. On a conflict the slot is marked unavailable, the user stays
 * here, and alternatives are suggested. The conflict engine is a local demo
 * simulation — there is no multi-user synchronization in the MVP.
 */
export function RoomDetailsScreen({
  route,
  navigation,
}: RootStackScreenProps<'RoomDetails'>): JSX.Element {
  const { roomId } = route.params;
  const { data: room, isPending, isError, refetch } = useRoom(roomId);
  const { data: allRoomsData } = useRooms();
  const allRooms = allRoomsData ?? NO_ROOMS;

  const bookings = useBookingStore((state) => state.bookings);
  const conflictedSlotKeys = useBookingStore((state) => state.conflictedSlotKeys);
  const addBooking = useBookingStore((state) => state.addBooking);
  const markSlotConflict = useBookingStore((state) => state.markSlotConflict);
  const isHydrated = useBookingStoreHydrated();

  const now = useNow();
  const todayKey = toDateKey(now);
  const dates = useMemo(() => getBookableDates(todayKey), [todayKey]);

  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [selectedSlotId, setSelectedSlotId] = useState<SlotId | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflict, setConflict] = useState<ConflictContext | null>(null);
  // Synchronous guard: blocks a second tap before the disabled state re-renders.
  const inFlightRef = useRef(false);

  const bookedKeys = useMemo(() => getConfirmedSlotKeys(bookings), [bookings]);
  const conflictedKeys = useMemo(() => new Set(conflictedSlotKeys), [conflictedSlotKeys]);

  // A date is valid only while it is inside the 7-day window (it can fall out if
  // the screen stays open past midnight).
  const isDateValid = dates.some((date) => date.key === selectedDate);

  const slotItems = useMemo<readonly SlotItem[]>(
    () =>
      TIME_SLOTS.map((slot): SlotItem => {
        const key = buildSlotKey(roomId, selectedDate, slot.id);
        let state: SlotCardState = 'available';
        if (isSlotPast(selectedDate, slot, now)) {
          state = 'past';
        } else if (bookedKeys.has(key)) {
          state = 'booked';
        } else if (conflictedKeys.has(key)) {
          state = 'conflicted';
        } else if (slot.id === selectedSlotId) {
          state = 'selected';
        }
        return { slot, state };
      }),
    [roomId, selectedDate, selectedSlotId, now, bookedKeys, conflictedKeys],
  );

  const selectedItem = slotItems.find((item) => item.slot.id === selectedSlotId);
  const canBook =
    room !== undefined &&
    isHydrated &&
    !isSubmitting &&
    isDateValid &&
    selectedItem?.state === 'selected';

  // Alternatives, shown after a conflict on the currently selected date:
  // first other free slots of this room, otherwise similar rooms.
  const showAlternatives = conflict !== null && conflict.date === selectedDate;
  const alternativeSlots = useMemo(
    () => slotItems.filter((item) => item.state === 'available').map((item) => item.slot),
    [slotItems],
  );
  const similarRooms = useMemo(() => {
    if (!showAlternatives || alternativeSlots.length > 0 || room === undefined) {
      return NO_ROOMS;
    }
    return findSimilarRooms(room, allRooms, (candidate) => {
      const key = buildSlotKey(candidate.id, conflict.date, conflict.slotId);
      return bookedKeys.has(key) || conflictedKeys.has(key);
    });
  }, [
    showAlternatives,
    alternativeSlots.length,
    room,
    allRooms,
    conflict,
    bookedKeys,
    conflictedKeys,
  ]);
  const conflictSlotLabel = TIME_SLOTS.find((slot) => slot.id === conflict?.slotId)?.label;

  const handleSelectDate = useCallback((dateKey: string) => {
    setSelectedDate(dateKey);
    setSelectedSlotId(null);
  }, []);

  const handleSelectSlot = useCallback((slotId: SlotId) => {
    setSelectedSlotId((current) => (current === slotId ? null : slotId));
  }, []);

  const submitBooking = useCallback(async () => {
    if (inFlightRef.current || !canBook || room === undefined || selectedItem === undefined) {
      return;
    }
    const { slot } = selectedItem;
    const date = selectedDate;

    // Re-check with fresh data right before sending.
    if (isSlotPast(date, slot, new Date())) {
      setSelectedSlotId(null);
      Alert.alert('Time slot has started', 'Please choose a later time slot.');
      return;
    }
    const slotKey = buildSlotKey(room.id, date, slot.id);
    if (findConfirmedBooking(useBookingStore.getState().bookings, slotKey) !== undefined) {
      Alert.alert('Already booked', 'You already have a confirmed booking for this time slot.');
      return;
    }

    inFlightRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await reserveRoomDemo({ bookingId: createDemoBookingId(), room, date, slot });

      if (result.kind === 'conflict') {
        markSlotConflict(result.slotKey);
        setSelectedSlotId(null);
        setConflict({ date, slotId: slot.id });
        Alert.alert(CONFLICT_TITLE, CONFLICT_MESSAGE);
        return;
      }

      // Local duplicate prevention: the store refuses a slot that is already taken.
      if (addBooking(result.booking) === 'duplicate') {
        Alert.alert('Already booked', 'You already have a confirmed booking for this time slot.');
        return;
      }

      setSelectedSlotId(null);
      setConflict(null);
      navigation.navigate('BookingSuccess', { bookingId: result.booking.id });
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  }, [canBook, room, selectedItem, selectedDate, addBooking, markSlotConflict, navigation]);

  const handleBook = useCallback(() => {
    void submitBooking();
  }, [submitBooking]);

  const openSimilarRoom = useCallback(
    (similarRoomId: string) => {
      navigation.push('RoomDetails', { roomId: similarRoomId });
    },
    [navigation],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const renderDate = useCallback<ListRenderItem<BookableDate>>(
    ({ item }) => (
      <DateChip
        dateKey={item.key}
        weekday={item.weekday}
        isToday={item.isToday}
        selected={item.key === selectedDate}
        onSelect={handleSelectDate}
      />
    ),
    [selectedDate, handleSelectDate],
  );

  const renderSlot = useCallback<ListRenderItem<SlotItem>>(
    ({ item }) => (
      <SlotCard
        slotId={item.slot.id}
        label={item.slot.label}
        state={item.state}
        onSelect={handleSelectSlot}
      />
    ),
    [handleSelectSlot],
  );

  if (isPending) {
    return (
      <Screen edges={SCREEN_EDGES}>
        <View style={styles.loading}>
          <Skeleton width="100%" height={200} rounded="lg" />
          <Skeleton width="60%" height={28} />
          <Skeleton width="40%" height={18} />
        </View>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen edges={SCREEN_EDGES}>
        <EmptyState
          title="Could not load this room"
          actionLabel="Try again"
          onAction={handleRetry}
        />
      </Screen>
    );
  }

  if (room === undefined) {
    return (
      <Screen edges={SCREEN_EDGES}>
        <EmptyState title="Room not found" message={`No room has the id "${roomId}".`} />
      </Screen>
    );
  }

  const status = getMockRoomStatus(room.id);

  const header = (
    <View>
      <Image source={{ uri: room.image }} style={styles.hero} accessibilityIgnoresInvertColors />
      <View style={styles.info}>
        <AppText variant="title">{room.name}</AppText>
        <AppText color="textSecondary">
          Building {room.building} · Floor {room.floor} · {room.capacity} seats
        </AppText>
        <View style={styles.badgeRow}>
          {room.equipment.map((item) => (
            <Badge key={item} label={item} />
          ))}
        </View>
        <View style={styles.statusRow}>
          <Badge
            label={getRoomStatusLabel(status)}
            tone={status === 'available' ? 'success' : 'error'}
          />
          <AppText variant="caption" color="textSecondary">
            Demo status, not live occupancy
          </AppText>
        </View>
      </View>

      <AppText variant="heading" style={styles.sectionTitle}>
        Choose a date
      </AppText>
      <FlatList
        horizontal
        data={dates}
        renderItem={renderDate}
        keyExtractor={dateKeyOf}
        extraData={selectedDate}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateList}
      />

      <AppText variant="heading" style={styles.sectionTitle}>
        Choose a time slot
      </AppText>
    </View>
  );

  const footer = showAlternatives ? (
    <View style={styles.alternatives}>
      <AppText variant="heading">Alternatives</AppText>
      <AppText variant="caption" color="textSecondary">
        Demo mode: this conflict was simulated (about 30% of attempts). No other user booked this
        room.
      </AppText>

      {alternativeSlots.length > 0 ? (
        <>
          <AppText>Other free times for this room on {selectedDate}:</AppText>
          <View style={styles.chipRow}>
            {alternativeSlots.map((slot) => (
              <FilterChip
                key={slot.id}
                label={slot.label}
                selected={slot.id === selectedSlotId}
                onPress={() => {
                  handleSelectSlot(slot.id);
                }}
              />
            ))}
          </View>
        </>
      ) : similarRooms.length > 0 ? (
        <>
          <AppText>
            No other free times here on {selectedDate}. Similar rooms for {conflictSlotLabel}:
          </AppText>
          {similarRooms.map((similar) => (
            <Pressable
              key={similar.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${similar.name}`}
              onPress={() => {
                openSimilarRoom(similar.id);
              }}
            >
              <Card style={styles.similarCard}>
                <AppText variant="body" style={styles.similarName} numberOfLines={1}>
                  {similar.name}
                </AppText>
                <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                  Building {similar.building} · Floor {similar.floor} · {similar.capacity} seats ·{' '}
                  {similar.equipment.join(', ')}
                </AppText>
              </Card>
            </Pressable>
          ))}
        </>
      ) : (
        <AppText color="textSecondary">No alternatives available for this date.</AppText>
      )}
    </View>
  ) : null;

  const actionCaption = isSubmitting
    ? 'Processing your booking…'
    : !isHydrated
      ? 'Loading your saved bookings…'
      : canBook && selectedItem !== undefined
        ? `${selectedDate} · ${selectedItem.slot.label}`
        : 'Choose a date and an available time slot';

  return (
    <Screen edges={SCREEN_EDGES}>
      <FlatList
        data={slotItems}
        renderItem={renderSlot}
        keyExtractor={slotKeyOf}
        numColumns={2}
        columnWrapperStyle={styles.slotRow}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={styles.content}
      />

      <View style={styles.actionBar}>
        <AppText
          variant="caption"
          color="textSecondary"
          numberOfLines={1}
          accessibilityLiveRegion="polite"
        >
          {actionCaption}
        </AppText>
        <AppButton
          label="Đặt phòng"
          onPress={handleBook}
          disabled={!canBook}
          loading={isSubmitting}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    padding: spacing.md,
    gap: spacing.md,
  },
  content: {
    paddingBottom: spacing.lg,
  },
  hero: {
    width: '100%',
    height: 200,
    backgroundColor: colors.border,
  },
  info: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  dateList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  slotRow: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  alternatives: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.surface,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  similarCard: {
    gap: spacing.xs,
  },
  similarName: {
    fontWeight: '600',
  },
  actionBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
});
