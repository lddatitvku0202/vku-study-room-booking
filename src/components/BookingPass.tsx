import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { colors, spacing } from '@/data/theme';

import type { JSX } from 'react';

export interface BookingPassProps {
  /** `bookingId | roomName | date | slotLabel`, from `buildBookingPassPayload`. */
  readonly payload: string;
}

const QR_SIZE = 184;

/** QR booking pass. Display-only: the app has no scanner and no check-in. */
export function BookingPass({ payload }: BookingPassProps): JSX.Element {
  return (
    <Card style={styles.card}>
      <View
        style={styles.qr}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Booking pass QR code: ${payload}`}
      >
        <QRCode
          value={payload}
          size={QR_SIZE}
          color={colors.text}
          backgroundColor={colors.surface}
        />
      </View>
      <AppText variant="caption" color="textSecondary" style={styles.payload} selectable>
        {payload}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  qr: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
  },
  payload: {
    textAlign: 'center',
  },
});
