const BASE = '/api/hotel';

export async function getHotels() {
  const res = await fetch(`${BASE}/hotels`);
  return res.json();
}

export async function getHotel(id) {
  const res = await fetch(`${BASE}/hotels/${id}`);
  return res.json();
}

export async function getRooms(hotelId) {
  const res = await fetch(`${BASE}/hotels/${hotelId}/rooms`);
  return res.json();
}

export async function getAvailableRooms(hotelId, checkIn, checkOut) {
  const params = new URLSearchParams();
  if (checkIn) params.set('checkIn', checkIn);
  if (checkOut) params.set('checkOut', checkOut);
  const res = await fetch(`${BASE}/hotels/${hotelId}/rooms/available?${params}`);
  return res.json();
}

export async function bookRoom(roomId, userId, guestName, checkIn, checkOut) {
  const res = await fetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, userId, guestName, checkIn, checkOut }),
  });
  return res.json();
}

export async function checkInBooking(id) {
  const res = await fetch(`${BASE}/bookings/${id}/check-in`, { method: 'POST' });
  return res.json();
}

export async function checkOutBooking(id) {
  const res = await fetch(`${BASE}/bookings/${id}/check-out`, { method: 'POST' });
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
