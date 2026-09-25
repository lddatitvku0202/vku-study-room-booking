/**
 * Local demo booking store — EMERGENCY MVP.
 *
 * Holds the demo bookings, the room filters, and the slots marked conflicted by
 * the demo simulator. Components read it through narrow selectors, never by
 * subscribing to the whole store.
 *
 * MVP exception, on purpose: in the production design bookings are server state
 * (Firestore, read through TanStack Query) and never live in Zustand. The MVP has
 * no server, so these demo bookings are local records persisted with AsyncStorage.
 * They are device-local and are NOT synchronized between users.
 *
 * Persistence: only `bookings` is saved. Filters and conflict marks reset on
 * restart, so a random demo conflict can never leave a slot blocked for good.
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

export interface BookingStoreState {
  readonly bookings: readonly Booking[];
  readonly filters: RoomFilters;
  readonly conflictedSlotKeys: readonly string[];

  /** Adds a booking unless its id or its slot is already taken. Atomic in the JS thread. */
  readonly addBooking: (booking: Booking) => AddBookingResult;
  /** Marks a confirmed booking cancelled, which frees its slot. */
  readonly cancelBooking: (bookingId: string) => void;
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
        set((state) => ({
          bookings: state.bookings.map((booking): Booking =>
            booking.id === bookingId && booking.status === 'confirmed'
              ? { ...booking, status: 'cancelled' }
              : booking,
          ),
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
      partialize: (state): PersistedBookingState => ({ bookings: state.bookings }),
      merge: (persisted, current) => ({ ...current, bookings: readPersistedBookings(persisted) }),
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
