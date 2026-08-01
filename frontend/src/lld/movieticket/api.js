import { apiFetch } from '../../utils/api';

export function getMovies() {
  return apiFetch('/movie-ticket/movies');
}

export function getShows(movieId) {
  return apiFetch(`/movie-ticket/movies/${movieId}/shows`);
}

export function getSeats(showId) {
  return apiFetch(`/movie-ticket/shows/${showId}/seats`);
}

export function bookSeats(showId, seatIds, userId) {
  return apiFetch('/movie-ticket/book', {
    method: 'POST',
    body: JSON.stringify({ showId, seatIds, userId })
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
