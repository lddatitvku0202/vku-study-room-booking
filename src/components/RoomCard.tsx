import { memo, useCallback } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { colors, radius, spacing } from '@/data/theme';

import type { Room, RoomStatus } from '@/types/room';

/**
 * Fixed card height. Every line of text is clamped to one line so the card can
 * never grow — `getItemLayout` in the room list relies on this being exact.
 */
export const ROOM_CARD_HEIGHT = 136;
/** Gap below each card. */
export const ROOM_CARD_GAP = spacing.md;
/** Total vertical space one row occupies in the list (card + gap). */
export const ROOM_ROW_HEIGHT = ROOM_CARD_HEIGHT + ROOM_CARD_GAP;

const IMAGE_SIZE = ROOM_CARD_HEIGHT - spacing.md * 2;

/** Display label for a demo status. Not physical occupancy. */
export function getRoomStatusLabel(status: RoomStatus): string {
  return status === 'available' ? 'Available Now' : 'Occupied';
}

export interface RoomCardProps {
  readonly room: Room;
  readonly status: RoomStatus;
  /** Called with the room id. Pass a stable callback so memoization holds. */
  readonly onPress: (roomId: string) => void;
}

/**
 * One room in the browse list.
 *
 * Wrapped in `React.memo`: props are a stable `room` reference from the query
 * cache plus a primitive status string, so a row re-renders only when its own
 * data changes — not when the list scrolls, filters change, or a sibling updates.
 */
export const RoomCard = memo(function RoomCard({ room, status, onPress }: RoomCardProps) {
  const isAvailable = status === 'available';
  const statusLabel = getRoomStatusLabel(status);
  const handlePress = useCallback(() => {
    onPress(room.id);
  }, [onPress, room.id]);

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${room.name}, building ${room.building}, floor ${room.floor}, ${room.capacity} seats, ${statusLabel}`}
        accessibilityHint="Opens room details"
        onPress={handlePress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Card style={styles.card}>
          <Image
            source={{ uri: room.image }}
            style={styles.image}
            accessibilityIgnoresInvertColors
          />
          <View style={styles.body}>
            <AppText variant="heading" numberOfLines={1}>
              {room.name}
            </AppText>
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              Building {room.building} · Floor {room.floor}
            </AppText>
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {room.equipment.join(' · ')}
            </AppText>
            <View style={styles.statusRow}>
              <Badge label={statusLabel} tone={isAvailable ? 'success' : 'error'} />
              <AppText variant="caption" color="text" numberOfLines={1} style={styles.capacity}>
                {room.capacity} seats
              </AppText>
            </View>
          </View>
        </Card>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    height: ROOM_ROW_HEIGHT,
    paddingBottom: ROOM_CARD_GAP,
  },
  pressed: {
    opacity: 0.85,
  },
  card: {
    height: ROOM_CARD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  body: {
    flex: 1,
    marginLeft: spacing.md,
    gap: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  capacity: {
    fontWeight: '600',
  },
});
