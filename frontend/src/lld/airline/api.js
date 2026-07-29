const BASE = '/api/airline';

export async function getFlights() {
  const res = await fetch(`${BASE}/flights`);
  return res.json();
}

export async function getFlight(id) {
  const res = await fetch(`${BASE}/flights/${id}`);
  return res.json();
}

export async function searchFlights(source, destination, date) {
  const params = new URLSearchParams({ source, destination });
  if (date) params.set('date', date);
  const res = await fetch(`${BASE}/flights/search?${params}`);
  return res.json();
}

export async function getSeats(flightId) {
  const res = await fetch(`${BASE}/flights/${flightId}/seats`);
  return res.json();
}

export async function getAvailableSeats(flightId) {
  const res = await fetch(`${BASE}/flights/${flightId}/seats/available`);
  return res.json();
}

export async function bookFlight(flightId, seatIds, userId, passengerName) {
  const res = await fetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flightId, seatIds, userId, passengerName }),
  });
  return res.json();
}

export async function checkInBooking(id) {
  const res = await fetch(`${BASE}/bookings/${id}/check-in`, { method: 'POST' });
  return res.json();
}

export async function cancelBooking(id) {
  const res = await fetch(`${BASE}/bookings/${id}/cancel`, { method: 'POST' });
  return res.json();
}

export async function getBooking(id) {
  const res = await fetch(`${BASE}/bookings/${id}`);
  return res.json();
}

export async function getActiveBookings() {
  const res = await fetch(`${BASE}/bookings/active`);
  return res.json();
}
