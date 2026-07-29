const API = '/api/movie-ticket';

export async function getMovies() {
  const res = await fetch(`${API}/movies`);
  return res.json();
}

export async function getShows(movieId) {
  const res = await fetch(`${API}/movies/${movieId}/shows`);
  return res.json();
}

export async function getSeats(showId) {
  const res = await fetch(`${API}/shows/${showId}/seats`);
  return res.json();
}

export async function bookSeats(showId, seatIds, userId) {
  const res = await fetch(`${API}/book`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ showId, seatIds, userId })
  });
  return res.json();
}

export async function cancelBooking(bookingId) {
  const res = await fetch(`${API}/cancel`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId })
  });
  return res.json();
}

export async function getBooking(bookingId) {
  const res = await fetch(`${API}/bookings/${bookingId}`);
  return res.json();
}
