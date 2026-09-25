import { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { colors, radius, spacing } from '@/data/theme';

import type { Room, RoomStatus } from '@/types/room';

/**
 * Fixed card height. Every line of text is clamped to one line so the card can
 * never grow — `getItemLayout` in the room list relies on this being exact.
 */
export const ROOM_CARD_HEIGHT = 128;
/** Gap below each card. */
export const ROOM_CARD_GAP = spacing.md;
/** Total vertical space one row occupies in the list (card + gap). */
export const ROOM_ROW_HEIGHT = ROOM_CARD_HEIGHT + ROOM_CARD_GAP;

const IMAGE_SIZE = ROOM_CARD_HEIGHT - spacing.md * 2;

export interface RoomCardProps {
  readonly room: Room;
  readonly status: RoomStatus;
}

/**
 * One room in the browse list.
 *
 * Wrapped in `React.memo`: props are a stable `room` reference from the query
 * cache plus a primitive status string, so a row re-renders only when its own
 * data changes — not when the list scrolls or a sibling updates.
 */
export const RoomCard = memo(function RoomCard({ room, status }: RoomCardProps) {
  const isAvailable = status === 'available';
  const statusLabel = isAvailable ? 'Available' : 'Occupied';

  return (
    <View style={styles.row}>
      <Card
        style={styles.card}
        accessible
        accessibilityLabel={`${room.name}, building ${room.building}, floor ${room.floor}, ${room.capacity} seats, ${statusLabel}`}
      >
        <Image source={{ uri: room.image }} style={styles.image} accessibilityIgnoresInvertColors />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <AppText variant="heading" numberOfLines={1} style={styles.name}>
              {room.name}
            </AppText>
            <Badge label={statusLabel} tone={isAvailable ? 'success' : 'error'} />
          </View>
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            Building {room.building} · Floor {room.floor} · {room.capacity} seats
          </AppText>
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {room.equipment.join(' · ')}
          </AppText>
        </View>
      </Card>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    height: ROOM_ROW_HEIGHT,
    paddingBottom: ROOM_CARD_GAP,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flexShrink: 1,
  },
});
