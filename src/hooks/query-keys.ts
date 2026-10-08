/**
 * Typed query-key factory. Call sites never hand-write key arrays.
 */
export const roomKeys = {
  all: ['rooms'] as const,
};

/** Realtime slot-lock data bridged into the query cache (26R). */
export const availabilityKeys = {
  room: (roomId: string, date: string) => ['slotLocks', 'room', roomId, date] as const,
  date: (date: string) => ['slotLocks', 'date', date] as const,
};

/** Firestore bookings of the signed-in user (firebase mode). */
export const bookingKeys = {
  detail: (bookingId: string) => ['bookings', 'detail', bookingId] as const,
  mine: (uid: string) => ['bookings', 'mine', uid] as const,
};
