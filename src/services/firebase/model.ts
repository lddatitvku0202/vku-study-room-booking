/**
 * Firestore persistence model and typed converters (07R).
 *
 *   rooms/{roomId}          static catalogue — written only by the seed script
 *   bookings/{bookingId}    booking record + history — written only in transactions
 *   slotLocks/{slotKey}     the availability lock — written only in transactions
 *
 * Writers (`new…Document`, `cancellationUpdate`) produce exactly the fields the
 * Security Rules expect, with **server timestamps** for every server-owned time.
 * Readers (`…FromDocument`) validate a raw document and return a domain object,
 * or `null` for a malformed document — a bad document is skipped, never cast and
 * never allowed to crash a screen.
 *
 * Queries the app makes (all served by Firestore's automatic single-field indexes,
 * so `firestore.indexes.json` needs no composite index):
 *   bookings  where userId == uid                     (My Bookings)
 *   slotLocks where roomId == r and date == d         (slot grid, realtime)
 *   slotLocks where date == today                     (room list status, realtime)
 */

import { serverTimestamp, Timestamp, type FieldValue } from 'firebase/firestore';

import {
  findTimeSlot,
  isBookingStatus,
  isBuilding,
  isDateKey,
  isEquipment,
} from '@/utils/domain-guards';
import { buildSlotKey } from '@/utils/slot-key';

import type { Booking, SlotLock } from '@/types/booking';
import type { Building, Equipment, Room } from '@/types/room';
import type { TimeSlot } from '@/types/slot';

export const COLLECTIONS = {
  rooms: 'rooms',
  bookings: 'bookings',
  slotLocks: 'slotLocks',
} as const;

/** `rooms/{roomId}` — the room id is the document id. */
export interface RoomDocument {
  readonly name: string;
  readonly building: Building;
  readonly floor: number;
  readonly capacity: number;
  readonly equipment: readonly Equipment[];
  readonly image: string;
}

/** `bookings/{bookingId}` exactly as the booking transaction writes it. */
export interface NewBookingDocument {
  readonly bookingId: string;
  readonly userId: string;
  readonly roomId: string;
  readonly roomName: string;
  readonly building: Building;
  readonly date: string;
  readonly slotId: string;
  readonly slotLabel: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly slotKey: string;
  readonly status: 'confirmed';
  readonly createdAt: FieldValue;
  readonly updatedAt: FieldValue;
  readonly cancelledAt: null;
}

/** `slotLocks/{slotKey}` exactly as the booking transaction writes it. */
export interface NewSlotLockDocument {
  readonly slotKey: string;
  readonly roomId: string;
  readonly date: string;
  readonly slotId: string;
  readonly bookingId: string;
  readonly userId: string;
  readonly createdAt: FieldValue;
}

/** The fields a cancellation changes on `bookings/{bookingId}`. */
export interface CancellationUpdate {
  readonly status: 'cancelled';
  readonly updatedAt: FieldValue;
  readonly cancelledAt: FieldValue;
}

export interface NewBookingInput {
  readonly bookingId: string;
  readonly userId: string;
  readonly room: Pick<Room, 'id' | 'name' | 'building'>;
  readonly date: string;
  readonly slot: TimeSlot;
}

// ---------------------------------------------------------------- writers

export function roomToDocument(room: Room): RoomDocument {
  return {
    name: room.name,
    building: room.building,
    floor: room.floor,
    capacity: room.capacity,
    equipment: [...room.equipment],
    image: room.image,
  };
}

export function newBookingDocument(input: NewBookingInput): NewBookingDocument {
  const { bookingId, userId, room, date, slot } = input;
  return {
    bookingId,
    userId,
    roomId: room.id,
    roomName: room.name,
    building: room.building,
    date,
    slotId: slot.id,
    slotLabel: slot.label,
    startTime: slot.start,
    endTime: slot.end,
    slotKey: buildSlotKey(room.id, date, slot.id),
    status: 'confirmed',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    cancelledAt: null,
  };
}

export function newSlotLockDocument(input: NewBookingInput): NewSlotLockDocument {
  const { bookingId, userId, room, date, slot } = input;
  return {
    slotKey: buildSlotKey(room.id, date, slot.id),
    roomId: room.id,
    date,
    slotId: slot.id,
    bookingId,
    userId,
    createdAt: serverTimestamp(),
  };
}

export function cancellationUpdate(): CancellationUpdate {
  return { status: 'cancelled', updatedAt: serverTimestamp(), cancelledAt: serverTimestamp() };
}

// ---------------------------------------------------------------- readers

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function str(data: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = data[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function positiveInt(data: Readonly<Record<string, unknown>>, key: string): number | undefined {
  const value = data[key];
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

/**
 * A Firestore timestamp as ISO 8601. Read documents with
 * `snapshot.data({ serverTimestamps: 'estimate' })`, so a just-written server
 * timestamp already has its local estimate instead of `null`.
 */
function isoTime(value: unknown): string | undefined {
  return value instanceof Timestamp ? value.toDate().toISOString() : undefined;
}

export function roomFromDocument(id: string, data: unknown): Room | null {
  if (!isRecord(data) || id.length === 0) return null;
  const name = str(data, 'name');
  const building = data['building'];
  const floor = positiveInt(data, 'floor');
  const capacity = positiveInt(data, 'capacity');
  const equipmentRaw = data['equipment'];
  const image = str(data, 'image');
  if (
    name === undefined ||
    !isBuilding(building) ||
    floor === undefined ||
    capacity === undefined ||
    !Array.isArray(equipmentRaw) ||
    image === undefined
  ) {
    return null;
  }
  const equipment: Equipment[] = [];
  for (const item of equipmentRaw) {
    if (!isEquipment(item)) return null;
    equipment.push(item);
  }
  return { id, name, building, floor, capacity, equipment, image };
}

export function bookingFromDocument(id: string, data: unknown): Booking | null {
  if (!isRecord(data)) return null;
  const userId = str(data, 'userId');
  const roomId = str(data, 'roomId');
  const roomName = str(data, 'roomName');
  const building = data['building'];
  const date = data['date'];
  const slot = findTimeSlot(data['slotId']);
  const slotKey = str(data, 'slotKey');
  const status = data['status'];
  const createdAt = isoTime(data['createdAt']);
  if (
    str(data, 'bookingId') !== id ||
    userId === undefined ||
    roomId === undefined ||
    roomName === undefined ||
    !isBuilding(building) ||
    !isDateKey(date) ||
    slot === undefined ||
    data['slotLabel'] !== slot.label ||
    data['startTime'] !== slot.start ||
    data['endTime'] !== slot.end ||
    slotKey !== buildSlotKey(roomId, date, slot.id) ||
    !isBookingStatus(status) ||
    createdAt === undefined
  ) {
    return null;
  }
  return {
    id,
    userId,
    roomId,
    roomName,
    building,
    date,
    slotId: slot.id,
    slotLabel: slot.label,
    startTime: slot.start,
    endTime: slot.end,
    slotKey,
    status,
    createdAt,
    updatedAt: isoTime(data['updatedAt']),
    cancelledAt: isoTime(data['cancelledAt']),
  };
}

export function slotLockFromDocument(id: string, data: unknown): SlotLock | null {
  if (!isRecord(data)) return null;
  const roomId = str(data, 'roomId');
  const date = data['date'];
  const slot = findTimeSlot(data['slotId']);
  const bookingId = str(data, 'bookingId');
  const userId = str(data, 'userId');
  const createdAt = isoTime(data['createdAt']);
  if (
    roomId === undefined ||
    !isDateKey(date) ||
    slot === undefined ||
    bookingId === undefined ||
    userId === undefined ||
    createdAt === undefined ||
    str(data, 'slotKey') !== id ||
    id !== buildSlotKey(roomId, date, slot.id)
  ) {
    return null;
  }
  return { slotKey: id, roomId, date, slotId: slot.id, bookingId, userId, createdAt };
}
