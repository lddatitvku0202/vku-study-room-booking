import { describe, expect, it } from 'vitest';

import { bookingErrorText } from '@/utils/booking-messages';

import type { BookingErrorCode } from '@/utils/booking-contract';

const CODES: readonly BookingErrorCode[] = [
  'SLOT_TAKEN',
  'INVALID_SLOT',
  'PAST_SLOT',
  'OUTSIDE_WINDOW',
  'BOOKING_ID_CONFLICT',
  'UNAUTHENTICATED',
  'PERMISSION_DENIED',
  'NETWORK',
  'UNCONFIRMED',
  'NOT_FOUND',
  'NOT_OWNER',
  'ALREADY_CANCELLED',
  'UNKNOWN',
];

describe('bookingErrorText', () => {
  it.each(CODES)('%s has a title and a message', (code) => {
    const text = bookingErrorText(code);
    expect(text.title.length).toBeGreaterThan(0);
    expect(text.message.length).toBeGreaterThan(0);
  });

  it('a network failure says nothing was booked; an unconfirmed one says to check', () => {
    expect(bookingErrorText('NETWORK').message).toContain('Nothing was booked');
    expect(bookingErrorText('UNCONFIRMED').message).toContain('Check My Bookings');
  });
});
