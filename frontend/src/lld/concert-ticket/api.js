import { apiFetch } from '../../utils/api';

export function getVenues() {
  return apiFetch('/concert-ticket/venues');
}

export function getVenue(venueId) {
  return apiFetch(`/concert-ticket/venues/${venueId}`);
}

export function getEvents() {
  return apiFetch('/concert-ticket/events');
}

export function getEvent(eventId) {
  return apiFetch(`/concert-ticket/events/${eventId}`);
}

export function getSeats(eventId) {
  return apiFetch(`/concert-ticket/events/${eventId}/seats`);
}

export function getUsers() {
  return apiFetch('/concert-ticket/users');
}

export function selectSeats(eventId, seatIds, userId) {
  return apiFetch(`/concert-ticket/events/${eventId}/select`, {
    method: 'POST',
    body: JSON.stringify({ seatIds, userId })
  });
}

export function confirmBooking(bookingId, paymentMethod = 'UPI', idempotencyKey = null) {
  return apiFetch(`/concert-ticket/bookings/${bookingId}/confirm`, {
    method: 'POST',
    headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {},
    body: JSON.stringify({ paymentMethod, idempotencyKey })
  });
}

export function cancelBooking(bookingId) {
  return apiFetch(`/concert-ticket/bookings/${bookingId}/cancel`, {
    method: 'POST'
  });
}

export function getBooking(bookingId) {
  return apiFetch(`/concert-ticket/bookings/${bookingId}`);
}

export function getUserBookings(userId) {
  return apiFetch(`/concert-ticket/users/${userId}/bookings`);
}

// =========================================================================
// ISOLATED SIMULATION API HELPERS
// =========================================================================

export function simReset() {
  return apiFetch('/concert-ticket/sim/reset', { method: 'POST' });
}

export function simGetEvents() {
  return apiFetch('/concert-ticket/sim/events');
}

export function simGetSeats(eventId) {
  return apiFetch(`/concert-ticket/sim/events/${eventId}/seats`);
}

export function simGetEventLog() {
  return apiFetch('/concert-ticket/sim/log');
}

export function simSelectSeats(eventId, seatIds, userId, actorName) {
  return apiFetch('/concert-ticket/sim/select', {
    method: 'POST',
    body: JSON.stringify({ eventId, seatIds, userId, actorName })
  });
}

export function simConfirmBooking(bookingId, actorName) {
  return apiFetch('/concert-ticket/sim/confirm', {
    method: 'POST',
    body: JSON.stringify({ bookingId, actorName })
  });
}

export function simCancelBooking(bookingId, actorName) {
  return apiFetch('/concert-ticket/sim/cancel', {
    method: 'POST',
    body: JSON.stringify({ bookingId, actorName })
  });
}

export function simExpireHold(eventId, seatIds, actorName) {
  return apiFetch('/concert-ticket/sim/expire', {
    method: 'POST',
    body: JSON.stringify({ eventId, seatIds, actorName })
  });
}
