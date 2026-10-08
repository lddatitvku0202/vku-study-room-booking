/**
 * Booking reads from Firestore. Owner-only by Security Rules; documents are
 * validated by `bookingFromDocument`. Takes the Firestore instance as a parameter.
 */

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';

import { bookingFromDocument, COLLECTIONS } from '@/services/firebase/model';

import type { Booking } from '@/types/booking';

/** One booking of the signed-in user, or `null` if it does not exist or is malformed. */
export async function fetchBookingDocument(
  db: Firestore,
  bookingId: string,
): Promise<Booking | null> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.bookings, bookingId));
  return snapshot.exists()
    ? bookingFromDocument(snapshot.id, snapshot.data({ serverTimestamps: 'estimate' }))
    : null;
}

/**
 * Realtime list of one user's bookings (My Bookings). The query is scoped to the
 * uid, which is also what the Security Rules require for a list.
 */
export function listenToUserBookings(
  db: Firestore,
  uid: string,
  onNext: (bookings: readonly Booking[]) => void,
  onError: (error: unknown) => void,
): () => void {
  return onSnapshot(
    query(collection(db, COLLECTIONS.bookings), where('userId', '==', uid)),
    (snapshot) => {
      const bookings: Booking[] = [];
      for (const document of snapshot.docs) {
        const booking = bookingFromDocument(
          document.id,
          document.data({ serverTimestamps: 'estimate' }),
        );
        if (booking !== null) bookings.push(booking);
      }
      onNext(bookings);
    },
    onError,
  );
}
