import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, View, type ListRenderItem } from 'react-native';

import { DateChip } from '@/components/DateChip';
import { getRoomStatusLabel } from '@/components/RoomCard';
import { SlotCard, type SlotCardState } from '@/components/SlotCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radius, spacing } from '@/data/theme';
import { TIME_SLOTS, type SlotId } from '@/data/time-slots';
import { useRoom } from '@/hooks/use-rooms';
import { useNow } from '@/hooks/useNow';
import { getBookableDates, isSlotPast, toDateKey, type BookableDate } from '@/utils/booking-dates';
import { getMockRoomStatus } from '@/utils/mock-room-status';

import type { RootStackScreenProps } from '@/navigation/types';
import type { JSX } from 'react';

type FixedSlot = (typeof TIME_SLOTS)[number];

interface SlotItem {
  readonly slot: FixedSlot;
  readonly state: SlotCardState;
}

// The native header already pads the top; the bottom inset belongs to the action bar.
const SCREEN_EDGES = ['left', 'right', 'bottom'] as const;

function dateKeyOf(date: BookableDate): string {
  return date.key;
}

function slotKeyOf(item: SlotItem): string {
  return item.slot.id;
}

/**
 * Room details with date and slot selection.
 *
 * Receives only `roomId` from navigation and reads the room from the shared
 * `['rooms']` query cache. Date and slot are local UI state; the "Đặt phòng"
 * button enables only for a valid date plus a slot that has not started yet.
 * Booking itself is MVP-04 — the button shows a placeholder here.
 */
export function RoomDetailsScreen({ route }: RootStackScreenProps<'RoomDetails'>): JSX.Element {
  const { roomId } = route.params;
  const { data: room, isPending, isError, refetch } = useRoom(roomId);

  const now = useNow();
  const todayKey = toDateKey(now);
  const dates = useMemo(() => getBookableDates(todayKey), [todayKey]);

  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [selectedSlotId, setSelectedSlotId] = useState<SlotId | null>(null);

  // A date is valid only while it is inside the 7-day window (it can fall out if
  // the screen stays open past midnight).
  const isDateValid = dates.some((date) => date.key === selectedDate);

  const slotItems = useMemo<readonly SlotItem[]>(
    () =>
      TIME_SLOTS.map((slot) => ({
        slot,
        state: isSlotPast(selectedDate, slot, now)
          ? 'past'
          : slot.id === selectedSlotId
            ? 'selected'
            : 'available',
      })),
    [selectedDate, selectedSlotId, now],
  );

  const selectedItem = slotItems.find((item) => item.slot.id === selectedSlotId);
  const canBook = room !== undefined && isDateValid && selectedItem?.state === 'selected';

  const handleSelectDate = useCallback((dateKey: string) => {
    setSelectedDate(dateKey);
    setSelectedSlotId(null);
  }, []);

  const handleSelectSlot = useCallback((slotId: SlotId) => {
    setSelectedSlotId((current) => (current === slotId ? null : slotId));
  }, []);

  const handleBook = useCallback(() => {
    if (!canBook || room === undefined || selectedItem === undefined) {
      return;
    }
    // Placeholder until MVP-04 adds the booking flow. No booking is created.
    Alert.alert(
      'Đặt phòng',
      `${room.name}\n${selectedDate} · ${selectedItem.slot.label}\n\nBooking will be added in the next step.`,
    );
  }, [canBook, room, selectedItem, selectedDate]);

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

  return (
    <Screen edges={SCREEN_EDGES}>
      <FlatList
        data={slotItems}
        renderItem={renderSlot}
        keyExtractor={slotKeyOf}
        numColumns={2}
        columnWrapperStyle={styles.slotRow}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
      />

      <View style={styles.actionBar}>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {canBook && selectedItem !== undefined
            ? `${selectedDate} · ${selectedItem.slot.label}`
            : 'Choose a date and an available time slot'}
        </AppText>
        <AppButton label="Đặt phòng" onPress={handleBook} disabled={!canBook} />
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
