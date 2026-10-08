import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { bookingKeys } from '@/hooks/query-keys';
import { useDataSource } from '@/hooks/useDataSource';
import { createDemoBookingId, reserveRoomDemo } from '@/services/bookingSimulator';
import { loadFirebaseBackend } from '@/services/firebase-backend';
import { useBookingStore } from '@/store/useBookingStore';
import { createBookingId, type BookingOutcome } from '@/utils/booking-contract';
import { buildSlotKey } from '@/utils/slot-key';

import type { Room } from '@/types/room';
import type { TimeSlot } from '@/types/slot';

export interface CreateBookingInput {
  readonly room: Room;
  readonly date: string;
  readonly slot: TimeSlot;
}

/** `duplicate`: mock mode only — this device already holds the slot. */
export type CreateBookingResult = BookingOutcome | { readonly kind: 'duplicate' };

/**
 * Books a slot through the active data source (AD-37).
 *
 * - mock: the MVP's local simulator (1–1.5 s, ~70/30) and the device store —
 *   labelled as a simulation, never used in firebase mode (AD-38);
 * - firebase: the atomic `runTransaction()` (29R). The outcome is returned only
 *   after Firestore has committed or refused; there is no optimistic success (I4).
 *
 * One booking id per attempt: if the same slot is retried after a network or
 * unconfirmed failure, the same id is sent again, so a commit that did happen
 * is returned instead of creating a second booking (I6).
 */
export function useCreateBooking(): (input: CreateBookingInput) => Promise<CreateBookingResult> {
  const isFirebase = useDataSource() === 'firebase';
  const addBooking = useBookingStore((state) => state.addBooking);
  const queryClient = useQueryClient();
  const attemptRef = useRef<{ readonly slotKey: string; readonly bookingId: string } | null>(null);

  return useCallback(
    async ({ room, date, slot }: CreateBookingInput): Promise<CreateBookingResult> => {
      if (!isFirebase) {
        const result = await reserveRoomDemo({
          bookingId: createDemoBookingId(),
          room,
          date,
          slot,
        });
        if (result.kind === 'conflict') {
          return { kind: 'conflict', slotKey: result.slotKey };
        }
        return addBooking(result.booking) === 'duplicate'
          ? { kind: 'duplicate' }
          : { kind: 'success', booking: result.booking, replayed: false };
      }

      const slotKey = buildSlotKey(room.id, date, slot.id);
      const previous = attemptRef.current;
      const bookingId =
        previous !== null && previous.slotKey === slotKey ? previous.bookingId : createBookingId();
      attemptRef.current = { slotKey, bookingId };

      let outcome: BookingOutcome;
      try {
        const backend = await loadFirebaseBackend();
        outcome = await backend.createBooking({ bookingId, room, date, slotId: slot.id });
      } catch {
        // The session could not be established; nothing was sent.
        outcome = { kind: 'error', code: 'UNAUTHENTICATED' };
      }

      const retryable =
        outcome.kind === 'error' &&
        (outcome.code === 'NETWORK' ||
          outcome.code === 'UNCONFIRMED' ||
          outcome.code === 'UNKNOWN');
      if (!retryable) {
        attemptRef.current = null;
      }
      if (outcome.kind === 'success') {
        // Lets the confirmation screen render immediately; it revalidates from Firestore.
        queryClient.setQueryData(bookingKeys.detail(outcome.booking.id), outcome.booking);
      }
      return outcome;
    },
    [isFirebase, addBooking, queryClient],
  );
}
