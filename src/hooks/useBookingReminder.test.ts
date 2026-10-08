import { beforeEach, describe, expect, it, vi } from 'vitest';

import { scheduleBookingReminder } from '@/hooks/useBookingReminder';

import type { Booking } from '@/types/booking';

const notifications = vi.hoisted(() => ({
  scheduleLocalReminder: vi.fn(),
  cancelScheduledNotification: vi.fn(),
}));
const store = vi.hoisted(() => {
  const state = {
    notificationIds: {} as Record<string, string>,
    setBookingNotificationId: (bookingId: string, id: string) => {
      state.notificationIds[bookingId] = id;
    },
  };
  return state;
});

vi.mock('@/services/local-notifications', () => notifications);
vi.mock('@/store/useBookingStore', () => ({ useBookingStore: { getState: () => store } }));

let counter = 0;
function booking(overrides: Partial<Booking> = {}): Booking {
  counter += 1;
  return {
    id: `bk-reminder-${counter}`,
    userId: 'firebase-uid',
    roomId: 'room-B205',
    roomName: 'Study Room B205',
    building: 'B',
    date: '2026-10-09',
    slotId: '13:00-15:00',
    slotLabel: '13:00 - 15:00',
    startTime: '13:00',
    endTime: '15:00',
    slotKey: 'room-B205_2026-10-09_13:00-15:00',
    status: 'confirmed',
    createdAt: '2026-10-08T00:00:00.000Z',
    ...overrides,
  };
}
const MORNING = new Date(2026, 9, 9, 8, 0); // local 08:00 on 2026-10-09

beforeEach(() => {
  notifications.scheduleLocalReminder.mockReset();
  notifications.cancelScheduledNotification.mockReset();
  notifications.cancelScheduledNotification.mockResolvedValue('cancelled');
  store.notificationIds = {};
});

describe('scheduleBookingReminder', () => {
  it('a confirmed Firestore booking (not in the local store) keeps its reminder', async () => {
    notifications.scheduleLocalReminder.mockResolvedValue({
      kind: 'scheduled',
      notificationId: 'n-1',
    });
    const b = booking();
    const status = await scheduleBookingReminder(b, () => true, MORNING);
    expect(status.kind).toBe('scheduled');
    expect(notifications.cancelScheduledNotification).not.toHaveBeenCalled();
    expect(store.notificationIds[b.id]).toBe('n-1');
    const request = notifications.scheduleLocalReminder.mock.calls[0]?.[0];
    expect(request.title).toBe('Nhắc lịch đặt phòng');
    expect(request.body).toBe('Sắp đến giờ sử dụng phòng Study Room B205 lúc 13:00');
    expect(request.fireAt).toEqual(new Date(2026, 9, 9, 12, 45));
  });

  it('a booking cancelled while the permission prompt was open gets its reminder cancelled', async () => {
    notifications.scheduleLocalReminder.mockResolvedValue({
      kind: 'scheduled',
      notificationId: 'n-2',
    });
    const b = booking();
    const status = await scheduleBookingReminder(b, () => false, MORNING);
    expect(status.kind).toBe('booking-cancelled');
    expect(notifications.cancelScheduledNotification).toHaveBeenCalledWith('n-2');
    expect(store.notificationIds[b.id]).toBeUndefined();
  });

  it('nothing is scheduled when the reminder time has passed', async () => {
    const status = await scheduleBookingReminder(
      booking(),
      () => true,
      new Date(2026, 9, 9, 12, 50),
    );
    expect(status.kind).toBe('too-late');
    expect(notifications.scheduleLocalReminder).not.toHaveBeenCalled();
  });

  it('a denied permission is reported, nothing stored', async () => {
    notifications.scheduleLocalReminder.mockResolvedValue({ kind: 'permission-denied' });
    const b = booking();
    expect((await scheduleBookingReminder(b, () => true, MORNING)).kind).toBe('permission-denied');
    expect(store.notificationIds[b.id]).toBeUndefined();
  });

  it('the same booking is scheduled once (remounts reuse the attempt)', async () => {
    notifications.scheduleLocalReminder.mockResolvedValue({
      kind: 'scheduled',
      notificationId: 'n-3',
    });
    const b = booking();
    await scheduleBookingReminder(b, () => true, MORNING);
    await scheduleBookingReminder(b, () => true, MORNING);
    expect(notifications.scheduleLocalReminder).toHaveBeenCalledTimes(1);
  });
});
