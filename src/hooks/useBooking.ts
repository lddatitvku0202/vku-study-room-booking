import { useQuery } from '@tanstack/react-query';

import { bookingKeys } from '@/hooks/query-keys';
import { useDataSource } from '@/hooks/useDataSource';
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
 * - firebase: Firestore through TanStack Query (owner-only by the rules). The
 *   booking transaction seeds this cache entry with its confirmed result, so the
 *   confirmation screen renders at once and then revalidates from the server.
 */
export function useBooking(bookingId: string): BookingLookup {
  const isFirebase = useDataSource() === 'firebase';
  const stored = useBookingStore((state) => state.bookings.find((b) => b.id === bookingId));

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
  return { booking: remote.data ?? undefined, isLoading: remote.isPending };
}
