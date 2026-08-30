import { apiFetch } from '../../utils/api';

const BASE_URL = '/api/airline';

// Flights & Seats
export function getFlights() {
  return apiFetch(`${BASE_URL}/flights`);
}

export function searchFlights(source, destination, date) {
  const params = new URLSearchParams();
  if (source) params.append('source', source);
  if (destination) params.append('destination', destination);
  if (date) params.append('date', date);
  return apiFetch(`${BASE_URL}/flights/search?${params.toString()}`);
}

export function getFlight(flightId) {
  return apiFetch(`${BASE_URL}/flights/${flightId}`);
}

export function getFlightSeats(flightId) {
  return apiFetch(`${BASE_URL}/flights/${flightId}/seats`);
}

// Hold & Booking
export function holdSeats(flightId, seatNumbers, userId) {
  return apiFetch(`${BASE_URL}/flights/${flightId}/hold`, {
    method: 'POST',
    body: JSON.stringify({ seatNumbers, userId }),
  });
}

// bookingData may include an optional `fareType` ('FLEXIBLE' | 'BASIC'); defaults server-side to FLEXIBLE.
export function bookFlight(bookingData) {
  return apiFetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    body: JSON.stringify(bookingData),
  });
}

export function cancelBooking(bookingId) {
  return apiFetch(`${BASE_URL}/bookings/${bookingId}/cancel`, {
    method: 'POST',
  });
}

export function getUserBookings(userId) {
  return apiFetch(`${BASE_URL}/users/${userId}/bookings`);
}

// Simulation Endpoints
export function simReset() {
  return apiFetch(`${BASE_URL}/sim/reset`, { method: 'POST' });
}

export function simHold(flightId, seatNumbers, userId) {
  return apiFetch(`${BASE_URL}/sim/hold`, {
    method: 'POST',
    body: JSON.stringify({ flightId, seatNumbers, userId }),
  });
}

export function simBook(flightId, seatNumbers, passengerName, userId, fareType = 'FLEXIBLE') {
  return apiFetch(`${BASE_URL}/sim/book`, {
    method: 'POST',
    body: JSON.stringify({ flightId, seatNumbers, passengerName, userId, fareType }),
  });
}

export function simCancel(bookingId, hoursBeforeDeparture) {
  return apiFetch(`${BASE_URL}/sim/cancel`, {
    method: 'POST',
    body: JSON.stringify({ bookingId, hoursBeforeDeparture }),
  });
}

export function simExpire(flightId) {
  return apiFetch(`${BASE_URL}/sim/expire`, {
    method: 'POST',
    body: JSON.stringify({ flightId }),
  });
}

export function simGetSnapshots() {
  return apiFetch(`${BASE_URL}/sim/snapshots`);
}

export function simGetEvents() {
  return apiFetch(`${BASE_URL}/sim/events`);
}
