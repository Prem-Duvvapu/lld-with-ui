import { apiFetch } from '../../utils/api';

export function getEstimate(pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType) {
  const params = new URLSearchParams({ pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType });
  return apiFetch(`/uber/estimate?${params}`);
}

export function requestRide(userId, pickupLat, pickupLng, pickupLabel, dropoffLat, dropoffLng, dropoffLabel, vehicleType) {
  return apiFetch('/uber/rides', {
    method: 'POST',
    body: JSON.stringify({ userId, pickupLat, pickupLng, pickupLabel, dropoffLat, dropoffLng, dropoffLabel, vehicleType }),
  });
}

export function getRide(id) {
  return apiFetch(`/uber/rides/${id}`);
}

export function getUserRides(userId) {
  return apiFetch(`/uber/rides?userId=${userId}`);
}

export function getAllRides() {
  return apiFetch('/uber/rides');
}

export function startTrip(id) {
  return apiFetch(`/uber/rides/${id}/start`, { method: 'PUT' });
}

export function completeTrip(id, paymentMethod = 'UPI') {
  return apiFetch(`/uber/rides/${id}/complete`, {
    method: 'PUT',
    body: JSON.stringify({ paymentMethod }),
  });
}

export function cancelTrip(id) {
  return apiFetch(`/uber/rides/${id}/cancel`, { method: 'PUT' });
}

export function updateRideStatus(id, status, paymentMethod) {
  return apiFetch(`/uber/rides/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, paymentMethod }),
  });
}

export function getDrivers() {
  return apiFetch('/uber/drivers');
}

export function updateDriverStatus(id, status) {
  return apiFetch(`/uber/drivers/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export function getRiders() {
  return apiFetch('/uber/riders');
}
