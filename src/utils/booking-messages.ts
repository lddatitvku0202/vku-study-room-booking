/**
 * User-facing text for booking and cancellation failures. Pure.
 *
 * The conflict itself is not here: it keeps the exact course-required copy in
 * RoomDetailsScreen ("Đặt phòng không thành công" / "Rất tiếc, phòng này vừa được
 * người khác đặt thành công.").
 */

import type { BookingErrorCode } from '@/utils/booking-contract';

export interface ErrorText {
  readonly title: string;
  readonly message: string;
}

export function bookingErrorText(code: BookingErrorCode): ErrorText {
  switch (code) {
    case 'PAST_SLOT':
      return { title: 'Time slot has started', message: 'Please choose a later time slot.' };
    case 'OUTSIDE_WINDOW':
      return { title: 'Date not bookable', message: 'Rooms can be booked up to 7 days ahead.' };
    case 'INVALID_SLOT':
      return { title: 'Invalid time slot', message: 'Please choose one of the listed time slots.' };
    case 'SLOT_TAKEN':
      return { title: 'Slot not available', message: 'This time slot is already booked.' };
    case 'NETWORK':
      return {
        title: 'No connection',
        message: 'Booking needs an internet connection. Nothing was booked — please try again.',
      };
    case 'UNCONFIRMED':
      return {
        title: 'Booking not confirmed',
        message:
          "We couldn't confirm this booking with the server. Check My Bookings before trying again.",
      };
    case 'UNAUTHENTICATED':
      return {
        title: 'Not signed in',
        message: 'Your session could not be started. Check your connection and try again.',
      };
    case 'PERMISSION_DENIED':
      return {
        title: 'Request refused',
        message: 'The server refused this request. Please try again.',
      };
    case 'BOOKING_ID_CONFLICT':
      return {
        title: 'Please try again',
        message: 'This attempt could not be completed. Please book again.',
      };
    case 'NOT_FOUND':
      return { title: 'Booking not found', message: 'This booking no longer exists.' };
    case 'NOT_OWNER':
      return { title: 'Not your booking', message: 'Only the person who booked can cancel it.' };
    case 'ALREADY_CANCELLED':
      return { title: 'Already cancelled', message: 'This booking was already cancelled.' };
    case 'UNKNOWN':
      return {
        title: 'Something went wrong',
        message: 'The request was not confirmed. Check My Bookings, then try again.',
      };
  }
}
