import { describe, expect, it } from 'vitest';

import {
  deriveRoomStatus,
  isLockActiveAt,
  occupiedRoomIds,
  partitionLocks,
} from '@/utils/availability';
import { parseDateTime } from '@/utils/booking-dates';

import type { SlotLock } from '@/types/booking';

function lock(roomId: string, slotId: string, userId: string, date = '2026-10-09'): SlotLock {
  return {
    slotKey: `${roomId}_${date}_${slotId}`,
    roomId,
    date,
    slotId,
    bookingId: `bk-${roomId}-${slotId}`,
    userId,
    createdAt: '2026-10-08T00:00:00.000Z',
  };
}

const at = (time: string): Date => parseDateTime('2026-10-09', time);

describe('partitionLocks', () => {
  const locks = [lock('room-A101', '07:30-09:30', 'me'), lock('room-A101', '13:00-15:00', 'other')];

  it('splits mine from everyone else’s', () => {
    const { mine, others } = partitionLocks(locks, 'me');
    expect([...mine]).toEqual(['room-A101_2026-10-09_07:30-09:30']);
    expect([...others]).toEqual(['room-A101_2026-10-09_13:00-15:00']);
  });

  it('without a session every lock is someone else’s', () => {
    expect(partitionLocks(locks, undefined).mine.size).toBe(0);
    expect(partitionLocks(locks, undefined).others.size).toBe(2);
  });
});

describe('isLockActiveAt — slot boundaries', () => {
  const l = lock('room-A101', '07:30-09:30', 'x');
  it.each([
    ['07:29', false],
    ['07:30', true],
    ['09:29', true],
    ['09:30', false],
    ['12:00', false],
  ])('%s → %s', (time, expected) => {
    expect(isLockActiveAt(l, at(time))).toBe(expected);
  });

  it('a lock on another date is not active', () => {
    expect(isLockActiveAt(lock('room-A101', '07:30-09:30', 'x', '2026-10-10'), at('08:00'))).toBe(
      false,
    );
  });

  it('an unknown slot is never active', () => {
    expect(isLockActiveAt({ ...l, slotId: '06:00-07:00' }, at('06:30'))).toBe(false);
  });
});

describe('derived room status', () => {
  it('a room is occupied only while one of its booked slots is in progress', () => {
    const locks = [lock('room-A101', '07:30-09:30', 'x'), lock('room-B205', '13:00-15:00', 'y')];
    const at0800 = occupiedRoomIds(locks, at('08:00'));
    expect(deriveRoomStatus('room-A101', at0800)).toBe('occupied');
    expect(deriveRoomStatus('room-B205', at0800)).toBe('available');
    const at1400 = occupiedRoomIds(locks, at('14:00'));
    expect(deriveRoomStatus('room-A101', at1400)).toBe('available');
    expect(deriveRoomStatus('room-B205', at1400)).toBe('occupied');
  });
});
