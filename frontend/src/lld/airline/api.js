const BASE_URL = '/api/airline';

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'API request failed');
  }
  return res.json();
}

// Flights & Seats
export async function getFlights() {
  const res = await fetch(`${BASE_URL}/flights`);
  return handleResponse(res);
}

export async function searchFlights(source, destination, date) {
  const params = new URLSearchParams();
  if (source) params.append('source', source);
  if (destination) params.append('destination', destination);
  if (date) params.append('date', date);
  const res = await fetch(`${BASE_URL}/flights/search?${params.toString()}`);
  return handleResponse(res);
}

export async function getFlight(flightId) {
  const res = await fetch(`${BASE_URL}/flights/${flightId}`);
  return handleResponse(res);
}

export async function getFlightSeats(flightId) {
  const res = await fetch(`${BASE_URL}/flights/${flightId}/seats`);
  return handleResponse(res);
}

// Hold & Booking
export async function holdSeats(flightId, seatNumbers, userId) {
  const res = await fetch(`${BASE_URL}/flights/${flightId}/hold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seatNumbers, userId }),
  });
  return handleResponse(res);
}

export async function bookFlight(bookingData) {
  const res = await fetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookingData),
  });
  return handleResponse(res);
}

export async function cancelBooking(bookingId) {
  const res = await fetch(`${BASE_URL}/bookings/${bookingId}/cancel`, {
    method: 'POST',
  });
  return handleResponse(res);
}

export async function getUserBookings(userId) {
  const res = await fetch(`${BASE_URL}/users/${userId}/bookings`);
  return handleResponse(res);
}

// Simulation Endpoints
export async function simReset() {
  const res = await fetch(`${BASE_URL}/sim/reset`, { method: 'POST' });
  return handleResponse(res);
}

export async function simHold(flightId, seatNumbers, userId) {
  const res = await fetch(`${BASE_URL}/sim/hold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flightId, seatNumbers, userId }),
  });
  return handleResponse(res);
}

export async function simBook(flightId, seatNumbers, passengerName, userId) {
  const res = await fetch(`${BASE_URL}/sim/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flightId, seatNumbers, passengerName, userId }),
  });
  return handleResponse(res);
}

export async function simCancel(bookingId, hoursBeforeDeparture) {
  const res = await fetch(`${BASE_URL}/sim/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId, hoursBeforeDeparture }),
  });
  return handleResponse(res);
}

export async function simExpire(flightId) {
  const res = await fetch(`${BASE_URL}/sim/expire`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flightId }),
  });
  return handleResponse(res);
}

export async function simGetSnapshots() {
  const res = await fetch(`${BASE_URL}/sim/snapshots`);
  return handleResponse(res);
}

export async function simGetEvents() {
  const res = await fetch(`${BASE_URL}/sim/events`);
  return handleResponse(res);
}
