/**
 * Local demo booking store — EMERGENCY MVP.
 *
 * Holds the demo bookings, the room filters, the slots marked conflicted by the
 * demo simulator, and the local notification id of each booking's reminder. Components read it through narrow selectors, never by
 * subscribing to the whole store.
 *
 * MVP exception, on purpose: in the production design bookings are server state
 * (Firestore, read through TanStack Query) and never live in Zustand. The MVP has
 * no server, so these demo bookings are local records persisted with AsyncStorage.
 * They are device-local and are NOT synchronized between users.
 *
 * Persistence: only `bookings` and the notification id map are saved. Filters and
 * conflict marks reset on restart, so a random demo conflict can never leave a
 * slot blocked for good.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { findConfirmedBooking, getBookingSlotKey, isBooking } from '@/utils/booking-rules';
import { EMPTY_FILTERS } from '@/utils/room-filters';

import type { Booking } from '@/types/booking';
import type { RoomFilters } from '@/types/filters';
import type { Building, Equipment } from '@/types/room';

export type AddBookingResult = 'added' | 'duplicate';

export type CancelBookingResult =
  | {
      readonly kind: 'cancelled';
      readonly booking: Booking;
      /** Id of the reminder scheduled for this booking, if one was recorded. */
      readonly notificationId: string | undefined;
    }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'already-cancelled' };

export interface BookingStoreState {
  readonly bookings: readonly Booking[];
  readonly filters: RoomFilters;
  readonly conflictedSlotKeys: readonly string[];
  /**
   * `bookingId → scheduled local notification id`. Device-local client state:
   * it only says which reminder to cancel, never whether a booking exists.
   */
  readonly notificationIds: Readonly<Record<string, string>>;

  /** Adds a booking unless its id or its slot is already taken. Atomic in the JS thread. */
  readonly addBooking: (booking: Booking) => AddBookingResult;
  /**
   * Marks a confirmed booking cancelled and keeps it as history. Frees its slot,
   * clears any conflict mark on that slot, and removes (and returns) its
   * notification id so the caller can cancel the scheduled reminder.
   */
  readonly cancelBooking: (bookingId: string) => CancelBookingResult;
  /** Records the reminder scheduled for a booking. */
  readonly setBookingNotificationId: (bookingId: string, notificationId: string) => void;
  readonly markSlotConflict: (slotKey: string) => void;
  readonly clearConflict: (slotKey: string) => void;

  readonly setSearch: (search: string) => void;
  readonly toggleBuilding: (building: Building) => void;
  readonly toggleMinimumCapacity: (capacity: number) => void;
  readonly toggleEquipment: (item: Equipment) => void;
  readonly clearFilters: () => void;
}

interface PersistedBookingState {
  readonly bookings: readonly Booking[];
  readonly notificationIds: Readonly<Record<string, string>>;
}

const STORAGE_KEY = 'vku-demo-bookings';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Validates bookings read back from storage; malformed entries are dropped. */
function readPersistedBookings(persisted: unknown): readonly Booking[] {
  if (!isRecord(persisted)) {
    return [];
  }
  const list: unknown = persisted['bookings'];
  return Array.isArray(list) ? list.filter((item: unknown) => isBooking(item)) : [];
}

/** Validates the saved notification id map; non-string entries are dropped. */
function readPersistedNotificationIds(persisted: unknown): Readonly<Record<string, string>> {
  if (!isRecord(persisted)) {
    return {};
  }
  const map: unknown = persisted['notificationIds'];
  if (!isRecord(map)) {
    return {};
  }
  const valid: Record<string, string> = {};
  for (const [bookingId, notificationId] of Object.entries(map)) {
    if (typeof notificationId === 'string') {
      valid[bookingId] = notificationId;
    }
  }
  return valid;
}

// Hydration status is tracked here rather than read from persist.hasHydrated():
// zustand only sets that flag when hydration *succeeds*, so unreadable storage
// would leave booking blocked forever. This settles on success and failure alike.
// Declared before the store, because hydration starts while the store is created.
let isHydrationSettled = false;
const hydrationListeners = new Set<() => void>();

function settleHydration(error: unknown): void {
  if (error !== undefined && __DEV__) {
    console.warn('[bookings] could not restore saved demo bookings; starting empty', error);
  }
  isHydrationSettled = true;
  for (const listener of hydrationListeners) {
    listener();
  }
}

export const useBookingStore = create<BookingStoreState>()(
  persist(
    (set, get) => ({
      bookings: [],
      filters: EMPTY_FILTERS,
      conflictedSlotKeys: [],
      notificationIds: {},

      addBooking: (booking) => {
        const { bookings } = get();
        const isDuplicateId = bookings.some((existing) => existing.id === booking.id);
        const isSlotTaken =
          findConfirmedBooking(bookings, getBookingSlotKey(booking)) !== undefined;
        if (isDuplicateId || isSlotTaken) {
          return 'duplicate';
        }
        set({ bookings: [...bookings, booking] });
        return 'added';
      },

      cancelBooking: (bookingId) => {
        const { bookings, conflictedSlotKeys, notificationIds } = get();
        const target = bookings.find((booking) => booking.id === bookingId);
        if (target === undefined) {
          return { kind: 'not-found' };
        }
        if (target.status === 'cancelled') {
          return { kind: 'already-cancelled' };
        }
        const cancelled: Booking = { ...target, status: 'cancelled' };
        const slotKey = getBookingSlotKey(target);
        const notificationId = notificationIds[bookingId];
        const remainingNotificationIds = Object.fromEntries(
          Object.entries(notificationIds).filter(([id]) => id !== bookingId),
        );
        // One update: history kept, slot freed, conflict mark and reminder id dropped.
        set({
          bookings: bookings.map((booking) => (booking.id === bookingId ? cancelled : booking)),
          conflictedSlotKeys: conflictedSlotKeys.filter((key) => key !== slotKey),
          notificationIds: remainingNotificationIds,
        });
        return { kind: 'cancelled', booking: cancelled, notificationId };
      },

      setBookingNotificationId: (bookingId, notificationId) => {
        set((state) => ({
          notificationIds: {
            ...state.notificationIds,
            [bookingId]: notificationId,
          },
        }));
      },

      markSlotConflict: (slotKey) => {
        if (get().conflictedSlotKeys.includes(slotKey)) {
          return;
        }
        set((state) => ({ conflictedSlotKeys: [...state.conflictedSlotKeys, slotKey] }));
      },

      clearConflict: (slotKey) => {
        set((state) => ({
          conflictedSlotKeys: state.conflictedSlotKeys.filter((key) => key !== slotKey),
        }));
      },

      setSearch: (search) => {
        set((state) => ({ filters: { ...state.filters, search } }));
      },

      toggleBuilding: (building) => {
        set((state) => ({
          filters: {
            ...state.filters,
            building: state.filters.building === building ? undefined : building,
          },
        }));
      },

      toggleMinimumCapacity: (capacity) => {
        set((state) => ({
          filters: {
            ...state.filters,
            minimumCapacity: state.filters.minimumCapacity === capacity ? undefined : capacity,
          },
        }));
      },

      toggleEquipment: (item) => {
        set((state) => {
          const { equipment } = state.filters;
          return {
            filters: {
              ...state.filters,
              equipment: equipment.includes(item)
                ? equipment.filter((entry) => entry !== item)
                : [...equipment, item],
            },
          };
        });
      },

      clearFilters: () => {
        set({ filters: EMPTY_FILTERS });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage<PersistedBookingState>(() => AsyncStorage),
      partialize: (state): PersistedBookingState => ({
        bookings: state.bookings,
        notificationIds: state.notificationIds,
      }),
      // Still version 1: the id map is an optional addition, and data saved before
      // it existed loads with an empty map. A version bump would discard saved
      // bookings, because no migration is defined. (MVP-05 saved the map as
      // `notificationIdsByBookingId`; it was always empty, as nothing was
      // scheduled then, so it is simply ignored.)
      merge: (persisted, current) => ({
        ...current,
        bookings: readPersistedBookings(persisted),
        notificationIds: readPersistedNotificationIds(persisted),
      }),
      // The returned callback runs after hydration finishes *or fails*.
      // Parameters stay contextually typed so they don't disturb store inference.
      onRehydrateStorage: () => (_state, error) => {
        settleHydration(error);
      },
    },
  ),
);

function subscribeToHydration(onChange: () => void): () => void {
  hydrationListeners.add(onChange);
  return () => {
    hydrationListeners.delete(onChange);
  };
}

/** True once loading saved bookings has finished, whether or not it succeeded. */
export function hasBookingStoreHydrated(): boolean {
  return isHydrationSettled;
}

/**
 * True once persisted bookings have been loaded from AsyncStorage (or loading
 * failed and the store started empty). Booking is blocked until then, so a
 * duplicate check can never run against an empty list that is about to be
 * replaced by the saved one.
 */
export function useBookingStoreHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToHydration,
    hasBookingStoreHydrated,
    hasBookingStoreHydrated,
  );
}
