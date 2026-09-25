import { useCallback } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';

import type { RootStackScreenProps } from '@/navigation/types';
import type { JSX } from 'react';

const SCREEN_EDGES = ['left', 'right', 'bottom'] as const;

/**
 * Shown after a booking succeeds. Receives only `bookingId`.
 * MVP-03 registers the route; MVP-04 creates bookings and shows their details.
 */
export function BookingSuccessScreen({
  route,
  navigation,
}: RootStackScreenProps<'BookingSuccess'>): JSX.Element {
  const { bookingId } = route.params;

  const handleDone = useCallback(() => {
    navigation.popToTop();
  }, [navigation]);

  return (
    <Screen edges={SCREEN_EDGES}>
      <EmptyState
        title="Booking confirmed"
        message={`Booking ID: ${bookingId}`}
        actionLabel="Back to rooms"
        onAction={handleDone}
      />
    </Screen>
  );
}
