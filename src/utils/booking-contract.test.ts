import { describe, expect, it } from 'vitest';

import {
  createBookingId,
  decideBookingOutcome,
  decideCancellation,
  isBookingId,
  mapFirestoreErrorCode,
  validateBookingRequest,
  type BookingRequest,
} from '@/utils/booking-contract';
import { parseDateTime } from '@/utils/booking-dates';

const room = { id: 'room-B205', name: 'Study Room B205', building: 'B' } as const;
const NOW = parseDateTime('2026-10-09', '10:00');
const request = (date: string, slotId: string): BookingRequest => ({
  bookingId: 'bk1234567890',
  room,
  date,
  slotId,
});

describe('validateBookingRequest', () => {
  it('accepts a future slot inside the window and derives its slot key', () => {
    const result = validateBookingRequest(request('2026-10-09', '13:00-15:00'), NOW);
    expect(result).toEqual({
      ok: true,
      slot: { id: '13:00-15:00', label: '13:00 - 15:00', start: '13:00', end: '15:00' },
      slotKey: 'room-B205_2026-10-09_13:00-15:00',
    });
  });

  it.each([
    ['a slot that has started', '2026-10-09', '09:30-11:30', 'PAST_SLOT'],
    ['an earlier day', '2026-10-08', '15:00-17:00', 'PAST_SLOT'],
    ['the last day of the window (today + 6)', '2026-10-15', '07:30-09:30', true],
    ['the day after the window (today + 7)', '2026-10-16', '07:30-09:30', 'OUTSIDE_WINDOW'],
    ['an unknown slot', '2026-10-10', '06:00-07:00', 'INVALID_SLOT'],
    ['a malformed date', '10/10/2026', '07:30-09:30', 'INVALID_SLOT'],
    ['an impossible date', '2026-02-30', '07:30-09:30', 'INVALID_SLOT'],
  ])('%s', (_label, date, slotId, expected) => {
    const result = validateBookingRequest(request(date, slotId), NOW);
    if (expected === true) expect(result.ok).toBe(true);
    else expect(result).toEqual({ ok: false, code: expected });
  });

  it('the start minute counts as started', () => {
    expect(
      validateBookingRequest(
        request('2026-10-09', '13:00-15:00'),
        parseDateTime('2026-10-09', '13:00'),
      ),
    ).toEqual({
      ok: false,
      code: 'PAST_SLOT',
    });
  });
});

describe('createBookingId', () => {
  it('produces 20 url-safe characters', () => {
    const id = createBookingId();
    expect(id).toMatch(/^[A-Za-z0-9]{20}$/);
    expect(isBookingId(id)).toBe(true);
  });

  it('is deterministic for a given random source (the source only provides uniqueness)', () => {
    const fixed = () => 0.5;
    expect(createBookingId(fixed)).toBe(createBookingId(fixed));
  });

  it('does not repeat across many attempts', () => {
    expect(new Set(Array.from({ length: 2000 }, () => createBookingId())).size).toBe(2000);
  });

  it('rejects unsafe ids', () => {
    expect(isBookingId('a/b')).toBe(false);
    expect(isBookingId('short')).toBe(false);
  });
});

describe('decideBookingOutcome', () => {
  const me = { bookingId: 'bk-mine', uid: 'me' };
  it('no lock and an unused id → PROCEED', () => {
    expect(decideBookingOutcome({ lock: null, booking: null }, me)).toBe('PROCEED');
  });
  it('a lock from another user → SLOT_TAKEN', () => {
    expect(
      decideBookingOutcome({ lock: { bookingId: 'bk-other', userId: 'other' }, booking: null }, me),
    ).toBe('SLOT_TAKEN');
  });
  it('my own different booking already holds the slot → SLOT_TAKEN', () => {
    expect(
      decideBookingOutcome({ lock: { bookingId: 'bk-older', userId: 'me' }, booking: null }, me),
    ).toBe('SLOT_TAKEN');
  });
  it('the lock is this same attempt (a retry after the commit) → IDEMPOTENT_SUCCESS', () => {
    expect(
      decideBookingOutcome(
        {
          lock: { bookingId: 'bk-mine', userId: 'me' },
          booking: { userId: 'me', status: 'confirmed' },
        },
        me,
      ),
    ).toBe('IDEMPOTENT_SUCCESS');
  });
  it('same booking id but another user’s lock → SLOT_TAKEN (never trust the id alone)', () => {
    expect(
      decideBookingOutcome({ lock: { bookingId: 'bk-mine', userId: 'other' }, booking: null }, me),
    ).toBe('SLOT_TAKEN');
  });
  it('released lock but the id is already used (cancelled) → BOOKING_ID_CONFLICT', () => {
    expect(
      decideBookingOutcome({ lock: null, booking: { userId: 'me', status: 'cancelled' } }, me),
    ).toBe('BOOKING_ID_CONFLICT');
  });
});

describe('decideCancellation', () => {
  const booking = {
    userId: 'me',
    status: 'confirmed',
    date: '2026-10-09',
    startTime: '13:00',
  } as const;
  it.each([
    ['my confirmed future booking', booking, 'me', 'PROCEED'],
    ['no booking', null, 'me', 'NOT_FOUND'],
    ['someone else’s booking', booking, 'other', 'NOT_OWNER'],
    [
      'an already cancelled booking',
      { ...booking, status: 'cancelled' },
      'me',
      'ALREADY_CANCELLED',
    ],
    ['a booking whose slot has started', { ...booking, startTime: '09:30' }, 'me', 'PAST_SLOT'],
  ] as const)('%s → %s', (_label, b, uid, expected) => {
    expect(decideCancellation(b, uid, NOW)).toBe(expected);
  });
});

describe('mapFirestoreErrorCode', () => {
  it.each([
    ['permission-denied', 'PERMISSION_DENIED'],
    ['unauthenticated', 'UNAUTHENTICATED'],
    ['unavailable', 'NETWORK'],
    ['deadline-exceeded', 'NETWORK'],
    ['aborted', 'UNKNOWN'],
    [undefined, 'UNKNOWN'],
  ] as const)('%s → %s', (code, expected) => {
    expect(mapFirestoreErrorCode(code)).toBe(expected);
  });
});
