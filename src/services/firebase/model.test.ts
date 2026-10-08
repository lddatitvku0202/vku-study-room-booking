import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';

import { MOCK_ROOMS } from '@/data/rooms';
import { TIME_SLOTS } from '@/data/time-slots';
import {
  bookingFromDocument,
  cancellationUpdate,
  newBookingDocument,
  newSlotLockDocument,
  roomFromDocument,
  roomToDocument,
  slotLockFromDocument,
} from '@/services/firebase/model';

const room = MOCK_ROOMS.find((r) => r.id === 'room-B205');
const slot = TIME_SLOTS[0];
if (room === undefined) throw new Error('fixture room missing');

const CREATED = Timestamp.fromDate(new Date('2026-10-08T03:00:00.000Z'));
const input = { bookingId: 'bk-1', userId: 'uid-a', room, date: '2026-10-09', slot } as const;

/** What Firestore returns after the server resolves the server timestamps. */
function stored<T extends object>(doc: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(doc).map(([key, value]) => [
      key,
      value !== null && typeof value === 'object' && !Array.isArray(value) ? CREATED : value,
    ]),
  );
}

describe('rooms', () => {
  it('all 120 catalogue rooms survive a round trip unchanged', () => {
    for (const r of MOCK_ROOMS) {
      expect(roomFromDocument(r.id, roomToDocument(r))).toEqual(r);
    }
  });

  it.each([
    ['unknown equipment', { equipment: ['Projector', 'Laser'] }],
    ['equipment not an array', { equipment: 'Projector' }],
    ['floor 0', { floor: 0 }],
    ['fractional capacity', { capacity: 2.5 }],
    ['unknown building', { building: 'Z' }],
    ['missing name', { name: undefined }],
  ])('rejects a room with %s', (_label, patch) => {
    expect(roomFromDocument(room.id, { ...roomToDocument(room), ...patch })).toBeNull();
  });

  it('rejects a missing document', () => {
    expect(roomFromDocument(room.id, undefined)).toBeNull();
  });
});

describe('bookings', () => {
  it('writes exactly the fields the rules expect, with server timestamps', () => {
    const doc = newBookingDocument(input);
    expect(Object.keys(doc).sort()).toEqual(
      [
        'bookingId',
        'building',
        'cancelledAt',
        'createdAt',
        'date',
        'endTime',
        'roomId',
        'roomName',
        'slotId',
        'slotKey',
        'slotLabel',
        'startTime',
        'status',
        'updatedAt',
        'userId',
      ].sort(),
    );
    expect(doc.slotKey).toBe('room-B205_2026-10-09_07:30-09:30');
    expect(doc.status).toBe('confirmed');
    expect(doc.cancelledAt).toBeNull();
    expect(doc.createdAt.isEqual(doc.updatedAt)).toBe(true);
  });

  it('round trip: written booking → stored document → domain booking', () => {
    const booking = bookingFromDocument('bk-1', stored(newBookingDocument(input)));
    expect(booking).toEqual({
      id: 'bk-1',
      userId: 'uid-a',
      roomId: 'room-B205',
      roomName: room.name,
      building: 'B',
      date: '2026-10-09',
      slotId: '07:30-09:30',
      slotLabel: '07:30 - 09:30',
      startTime: '07:30',
      endTime: '09:30',
      slotKey: 'room-B205_2026-10-09_07:30-09:30',
      status: 'confirmed',
      createdAt: '2026-10-08T03:00:00.000Z',
      updatedAt: '2026-10-08T03:00:00.000Z',
      cancelledAt: undefined,
    });
  });

  it('reads a cancelled booking with its cancellation time', () => {
    const doc = { ...stored(newBookingDocument(input)), ...stored(cancellationUpdate()) };
    const booking = bookingFromDocument('bk-1', doc);
    expect(booking?.status).toBe('cancelled');
    expect(booking?.cancelledAt).toBe('2026-10-08T03:00:00.000Z');
  });

  it.each([
    ['bookingId field ≠ document id', { bookingId: 'other' }],
    ['missing userId', { userId: undefined }],
    ['unknown building', { building: 'Z' }],
    ['malformed date', { date: '9/10/2026' }],
    ['unknown slot', { slotId: '06:00-07:00' }],
    ['label not matching the slot', { slotLabel: '07:30 - 10:00' }],
    ['start time not matching the slot', { startTime: '07:00' }],
    ['slotKey for another room', { slotKey: 'room-A101_2026-10-09_07:30-09:30' }],
    ['unknown status', { status: 'pending' }],
    ['createdAt not a timestamp', { createdAt: '2026-10-08T03:00:00.000Z' }],
  ])('rejects a booking with %s', (_label, patch) => {
    expect(
      bookingFromDocument('bk-1', { ...stored(newBookingDocument(input)), ...patch }),
    ).toBeNull();
  });
});

describe('slot locks', () => {
  const key = 'room-B205_2026-10-09_07:30-09:30';

  it('round trip: written lock → stored document → domain lock', () => {
    const doc = newSlotLockDocument(input);
    expect(Object.keys(doc).sort()).toEqual(
      ['bookingId', 'createdAt', 'date', 'roomId', 'slotId', 'slotKey', 'userId'].sort(),
    );
    expect(slotLockFromDocument(key, stored(doc))).toEqual({
      slotKey: key,
      roomId: 'room-B205',
      date: '2026-10-09',
      slotId: '07:30-09:30',
      bookingId: 'bk-1',
      userId: 'uid-a',
      createdAt: '2026-10-08T03:00:00.000Z',
    });
  });

  it.each([
    ['document id ≠ slotKey', 'room-B205_2026-10-09_09:30-11:30', {}],
    ['slotKey field ≠ id', key, { slotKey: 'x' }],
    ['missing owner', key, { userId: undefined }],
    ['missing booking reference', key, { bookingId: undefined }],
    ['unknown slot', key, { slotId: 'x' }],
  ])('rejects a lock with %s', (_label, id, patch) => {
    expect(
      slotLockFromDocument(id, { ...stored(newSlotLockDocument(input)), ...patch }),
    ).toBeNull();
  });
});
