/**
 * Booking reads from Firestore. Owner-only by Security Rules; documents are
 * validated by `bookingFromDocument`. Takes the Firestore instance as a parameter.
 */

import { doc, getDoc, type Firestore } from 'firebase/firestore';

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
