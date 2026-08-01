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

export function updateRideStatus(id, status) {
  return apiFetch(`/uber/rides/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}
