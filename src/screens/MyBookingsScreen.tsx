import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { spacing } from '@/data/theme';

import type { JSX } from 'react';

/** "My Bookings" tab. Booking history is built in a later MVP step. */
export function MyBookingsScreen(): JSX.Element {
  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">My Bookings</AppText>
      </View>
      <EmptyState
        title="Booking history is coming soon"
        message="Rooms you book will be listed here in a later step."
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
