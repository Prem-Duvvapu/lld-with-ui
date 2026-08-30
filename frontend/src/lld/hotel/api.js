import { apiFetch } from '../../utils/api';

export function getHotels() {
  return apiFetch('/hotel/hotels');
}

export function getHotel(id) {
  return apiFetch(`/hotel/hotels/${id}`);
}

export function getRooms(hotelId) {
  return apiFetch(`/hotel/hotels/${hotelId}/rooms`);
}

export function getAvailableRooms(hotelId, checkIn, checkOut) {
  const params = new URLSearchParams();
  if (checkIn) params.set('checkIn', checkIn);
  if (checkOut) params.set('checkOut', checkOut);
  return apiFetch(`/hotel/hotels/${hotelId}/rooms/available?${params}`);
}

export function bookRoom(roomId, userId, guestName, checkIn, checkOut) {
  return apiFetch('/hotel/bookings', {
    method: 'POST',
    body: JSON.stringify({ roomId, userId, guestName, checkIn, checkOut }),
  });
}

export function checkInBooking(id) {
  return apiFetch(`/hotel/bookings/${id}/check-in`, { method: 'POST' });
}

export function checkOutBooking(id) {
  return apiFetch(`/hotel/bookings/${id}/check-out`, { method: 'POST' });
}

export function cancelBooking(id) {
  return apiFetch(`/hotel/bookings/${id}/cancel`, { method: 'POST' });
}

export function getBooking(id) {
  return apiFetch(`/hotel/bookings/${id}`);
}

export function getActiveBookings() {
  return apiFetch('/hotel/bookings/active');
}

// Isolated Simulation Endpoints — a completely separate sandbox instance, so replaying the demo
// can never corrupt real hotel/room/booking data.
export function simReset() {
  return apiFetch('/hotel/sim/reset', { method: 'POST' });
}

export function simGetState() {
  return apiFetch('/hotel/sim/state');
}

export function simGetEvents() {
  return apiFetch('/hotel/sim/events');
}

export function simBookRoom(roomId, userId, guestName, checkIn, checkOut) {
  return apiFetch('/hotel/sim/book', {
    method: 'POST',
    body: JSON.stringify({ roomId, userId, guestName, checkIn, checkOut }),
  });
}

export function simCheckIn(bookingId, actorName) {
  return apiFetch(`/hotel/sim/bookings/${bookingId}/check-in`, {
    method: 'POST',
    body: JSON.stringify({ actorName }),
  });
}

export function simCheckOut(bookingId, actorName) {
  return apiFetch(`/hotel/sim/bookings/${bookingId}/check-out`, {
    method: 'POST',
    body: JSON.stringify({ actorName }),
  });
}

export function simCancelBooking(bookingId, actorName) {
  return apiFetch(`/hotel/sim/bookings/${bookingId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ actorName }),
  });
}

export function simRace(roomId, checkIn, checkOut, guests = 5) {
  return apiFetch('/hotel/sim/race', {
    method: 'POST',
    body: JSON.stringify({ roomId, checkIn, checkOut, guests }),
  });
}
