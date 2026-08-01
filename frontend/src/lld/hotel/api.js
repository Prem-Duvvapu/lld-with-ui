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
