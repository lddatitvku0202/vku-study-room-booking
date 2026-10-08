import { useQuery } from '@tanstack/react-query';

import { bookingKeys } from '@/hooks/query-keys';
import { useDataSource } from '@/hooks/useDataSource';
import { useMyBookings } from '@/hooks/useMyBookings';
import { loadFirebaseBackend } from '@/services/firebase-backend';
import { useBookingStore } from '@/store/useBookingStore';

import type { Booking } from '@/types/booking';

export interface BookingLookup {
  readonly booking: Booking | undefined;
  readonly isLoading: boolean;
}

/**
 * One booking by id.
 * - mock: the device store (the MVP);
 * - firebase: the realtime My Bookings list (so a cancellation shows at once),
 *   falling back to a one-off Firestore read seeded by the booking transaction's
 *   confirmed result while that list is still loading. Owner-only by the rules.
 */
export function useBooking(bookingId: string): BookingLookup {
  const isFirebase = useDataSource() === 'firebase';
  const stored = useBookingStore((state) => state.bookings.find((b) => b.id === bookingId));
  const mine = useMyBookings();
  const live = isFirebase ? mine.bookings.find((b) => b.id === bookingId) : undefined;

  const remote = useQuery({
    queryKey: bookingKeys.detail(bookingId),
    queryFn: async (): Promise<Booking | null> => {
      const backend = await loadFirebaseBackend();
      return backend.fetchBooking(bookingId);
    },
    enabled: isFirebase,
  });

  if (!isFirebase) {
    return { booking: stored, isLoading: false };
  }
  const booking = live ?? remote.data ?? undefined;
  return { booking, isLoading: booking === undefined && (remote.isPending || mine.isLoading) };
}
