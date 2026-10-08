import { describe, expect, it } from 'vitest';

import {
  findConfirmedBooking,
  getConfirmedSlotKeys,
  parseStoredBooking,
} from '@/utils/booking-rules';

/** A booking exactly as the submitted MVP saved it (no slotKey). */
const MVP_BOOKING = {
  id: 'demo-1',
  userId: 'demo-user',
  roomId: 'room-B205',
  roomName: 'Study Room B205',
  building: 'B',
  date: '2026-09-28',
  slotId: '07:30-09:30',
  slotLabel: '07:30 - 09:30',
  startTime: '07:30',
  endTime: '09:30',
  status: 'confirmed',
  createdAt: '2026-09-26T03:00:00.000Z',
};

describe('parseStoredBooking (mock-mode device storage)', () => {
  it('upgrades an MVP booking by deriving its slotKey', () => {
    expect(parseStoredBooking(MVP_BOOKING)?.slotKey).toBe('room-B205_2026-09-28_07:30-09:30');
  });

  it('keeps a matching stored slotKey and optional timestamps', () => {
    const parsed = parseStoredBooking({
      ...MVP_BOOKING,
      slotKey: 'room-B205_2026-09-28_07:30-09:30',
      status: 'cancelled',
      cancelledAt: '2026-09-27T00:00:00.000Z',
    });
    expect(parsed?.status).toBe('cancelled');
    expect(parsed?.cancelledAt).toBe('2026-09-27T00:00:00.000Z');
  });

  it.each([
    ['a slotKey for another slot', { slotKey: 'room-B205_2026-09-28_09:30-11:30' }],
    ['an unknown building', { building: 'Z' }],
    ['an unknown status', { status: 'pending' }],
    ['a missing id', { id: undefined }],
    ['a numeric date', { date: 20260928 }],
  ])('drops an entry with %s', (_label, patch) => {
    expect(parseStoredBooking({ ...MVP_BOOKING, ...patch })).toBeUndefined();
  });

  it('drops non-objects', () => {
    expect(parseStoredBooking(null)).toBeUndefined();
    expect(parseStoredBooking('x')).toBeUndefined();
  });
});

describe('slot occupancy', () => {
  const confirmed = parseStoredBooking(MVP_BOOKING);
  const cancelled = parseStoredBooking({ ...MVP_BOOKING, id: 'demo-2', status: 'cancelled' });
  if (confirmed === undefined || cancelled === undefined) throw new Error('fixture');

  it('only confirmed bookings hold a slot', () => {
    expect(getConfirmedSlotKeys([confirmed, cancelled])).toEqual(new Set([confirmed.slotKey]));
    expect(findConfirmedBooking([cancelled], confirmed.slotKey)).toBeUndefined();
    expect(findConfirmedBooking([cancelled, confirmed], confirmed.slotKey)?.id).toBe('demo-1');
  });
});
