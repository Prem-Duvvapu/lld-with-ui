import { apiFetch } from '../../utils/api';

const BASE = '/car-rental';

// ---- Branches ----
export function getBranches() {
  return apiFetch(`${BASE}/branches`);
}

// ---- Vehicles ----
export function getVehicles(branchId) {
  const qs = branchId ? `?branchId=${branchId}` : '';
  return apiFetch(`${BASE}/vehicles${qs}`);
}

export function getVehicle(id) {
  return apiFetch(`${BASE}/vehicles/${id}`);
}

export function searchAvailableVehicles(branchId, type, startDate, endDate) {
  const params = new URLSearchParams({ startDate, endDate });
  if (branchId) params.set('branchId', branchId);
  if (type) params.set('type', type);
  return apiFetch(`${BASE}/vehicles/available?${params}`);
}

// ---- Customers ----
export function getCustomers() {
  return apiFetch(`${BASE}/customers`);
}

export function registerCustomer(customer) {
  return apiFetch(`${BASE}/customers`, {
    method: 'POST',
    body: JSON.stringify(customer),
  });
}

// ---- Pricing ----
export function getEstimate(type, startDate, endDate) {
  const params = new URLSearchParams({ type, startDate, endDate });
  return apiFetch(`${BASE}/estimate?${params}`);
}

// ---- Reservations ----
export function reserveVehicle(customerId, vehicleId, startDate, endDate) {
  return apiFetch(`${BASE}/reservations`, {
    method: 'POST',
    body: JSON.stringify({ customerId, vehicleId, startDate, endDate }),
  });
}

export function confirmReservation(id, paymentMethod = 'UPI') {
  return apiFetch(`${BASE}/reservations/${id}/confirm`, {
    method: 'PUT',
    body: JSON.stringify({ paymentMethod }),
  });
}

export function pickupReservation(id) {
  return apiFetch(`${BASE}/reservations/${id}/pickup`, { method: 'PUT' });
}

export function returnVehicle(id, odometerReading, actualReturnDate) {
  return apiFetch(`${BASE}/reservations/${id}/return`, {
    method: 'PUT',
    body: JSON.stringify({ odometerReading, actualReturnDate }),
  });
}

export function cancelReservation(id) {
  return apiFetch(`${BASE}/reservations/${id}/cancel`, { method: 'PUT' });
}

export function getReservation(id) {
  return apiFetch(`${BASE}/reservations/${id}`);
}

export function getReservations(customerId) {
  const qs = customerId ? `?customerId=${customerId}` : '';
  return apiFetch(`${BASE}/reservations${qs}`);
}

// ---- Isolated simulation sandbox ----
export function simReset() {
  return apiFetch(`${BASE}/sim/reset`, { method: 'POST' });
}

export function simSeedVehicle(vehicle) {
  return apiFetch(`${BASE}/sim/vehicles`, {
    method: 'POST',
    body: JSON.stringify(vehicle),
  });
}

export function simSeedCustomer(customer) {
  return apiFetch(`${BASE}/sim/customers`, {
    method: 'POST',
    body: JSON.stringify(customer),
  });
}

export function simGetVehicles() {
  return apiFetch(`${BASE}/sim/vehicles`);
}

export function simGetReservations() {
  return apiFetch(`${BASE}/sim/reservations`);
}

export function simReserve(customerId, vehicleId, startDate, endDate) {
  return apiFetch(`${BASE}/sim/reservations`, {
    method: 'POST',
    body: JSON.stringify({ customerId, vehicleId, startDate, endDate }),
  });
}

export function simConfirm(id, paymentMethod = 'UPI') {
  return apiFetch(`${BASE}/sim/reservations/${id}/confirm`, {
    method: 'PUT',
    body: JSON.stringify({ paymentMethod }),
  });
}

export function simPickup(id) {
  return apiFetch(`${BASE}/sim/reservations/${id}/pickup`, { method: 'PUT' });
}

export function simReturn(id, odometerReading) {
  return apiFetch(`${BASE}/sim/reservations/${id}/return`, {
    method: 'PUT',
    body: JSON.stringify({ odometerReading }),
  });
}

export function simCancel(id) {
  return apiFetch(`${BASE}/sim/reservations/${id}/cancel`, { method: 'PUT' });
}
