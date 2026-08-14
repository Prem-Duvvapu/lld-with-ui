import { apiFetch } from '../../utils/api';

export function getMovies() {
  return apiFetch('/movie-ticket/movies');
}

export function getTheaters() {
  return apiFetch('/movie-ticket/theaters');
}

export function getUsers() {
  return apiFetch('/movie-ticket/users');
}

export function getShows(movieId) {
  return apiFetch(`/movie-ticket/movies/${movieId}/shows`);
}

export function getSeats(showId) {
  return apiFetch(`/movie-ticket/shows/${showId}/seats`);
}

export function holdSeats(showId, seatIds, userId) {
  return apiFetch(`/movie-ticket/shows/${showId}/hold`, {
    method: 'POST',
    body: JSON.stringify({ seatIds, userId })
  });
}

export function bookSeats(showId, seatIds, userId, paymentMethod = 'UPI', idempotencyKey = null) {
  return apiFetch('/movie-ticket/book', {
    method: 'POST',
    headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {},
    body: JSON.stringify({ showId, seatIds, userId, paymentMethod, idempotencyKey })
  });
}

export function cancelBooking(bookingId) {
  return apiFetch('/movie-ticket/cancel', {
    method: 'POST',
    body: JSON.stringify({ bookingId })
  });
}

export function getBooking(bookingId) {
  return apiFetch(`/movie-ticket/bookings/${bookingId}`);
}

export function getUserBookings(userId) {
  return apiFetch(`/movie-ticket/bookings/user/${userId}`);
}

// =========================================================================
// ISOLATED SIMULATION API HELPERS
// =========================================================================

export function simReset() {
  return apiFetch('/movie-ticket/sim/reset', { method: 'POST' });
}

export function simGetSeats(showId) {
  return apiFetch(`/movie-ticket/sim/seats/${showId}`);
}

export function simGetEvents() {
  return apiFetch('/movie-ticket/sim/events');
}

export function simHold(showId, seatIds, userId, actorName) {
  return apiFetch('/movie-ticket/sim/hold', {
    method: 'POST',
    body: JSON.stringify({ showId, seatIds, userId, actorName })
  });
}

export function simBook(showId, seatIds, userId, actorName) {
  return apiFetch('/movie-ticket/sim/book', {
    method: 'POST',
    body: JSON.stringify({ showId, seatIds, userId, actorName })
  });
}

export function simExpire(showId, seatIds, actorName) {
  return apiFetch('/movie-ticket/sim/expire', {
    method: 'POST',
    body: JSON.stringify({ showId, seatIds, actorName })
  });
}

export function simCancel(bookingId, actorName) {
  return apiFetch('/movie-ticket/sim/cancel', {
    method: 'POST',
    body: JSON.stringify({ bookingId, actorName })
  });
}
