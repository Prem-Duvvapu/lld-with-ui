import { apiFetch } from '../../utils/api';

export function getEstimate(pickupLat, pickupLng, pickupLabel, dropoffLat, dropoffLng, dropoffLabel, vehicleType) {
  const params = new URLSearchParams({ pickupLat, pickupLng, pickupLabel, dropoffLat, dropoffLng, dropoffLabel, vehicleType });
  return apiFetch(`/uber/estimate?${params}`);
}

export function requestRide(userId, pickupLat, pickupLng, pickupLabel, dropoffLat, dropoffLng, dropoffLabel, vehicleType, fare, distanceKm) {
  return apiFetch('/uber/rides', {
    method: 'POST',
    body: JSON.stringify({ userId, pickupLat, pickupLng, pickupLabel, dropoffLat, dropoffLng, dropoffLabel, vehicleType, fare, distanceKm }),
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

export function getDriverRequests(driverId) {
  return apiFetch(`/uber/drivers/${driverId}/requests`);
}

export function acceptRide(rideId, driverId) {
  return apiFetch(`/uber/rides/${rideId}/accept`, {
    method: 'PUT',
    body: JSON.stringify({ driverId }),
  });
}

export function declineRide(rideId, driverId) {
  return apiFetch(`/uber/rides/${rideId}/decline`, {
    method: 'PUT',
    body: JSON.stringify({ driverId }),
  });
}

export function verifyOtp(id, otp) {
  return apiFetch(`/uber/rides/${id}/verify-otp`, {
    method: 'PUT',
    body: JSON.stringify({ otp }),
  });
}

export function startTrip(id) {
  return apiFetch(`/uber/rides/${id}/start`, { method: 'PUT' });
}

export function arriveAtDestination(id) {
  return apiFetch(`/uber/rides/${id}/arrive`, { method: 'PUT' });
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

// ---- /sim/* : isolated sandbox for the Simulation tab — never touches the live rides/drivers above ----

export function simReset() {
  return apiFetch('/uber/sim/reset', { method: 'POST' });
}

export function simEstimate(step) {
  return apiFetch('/uber/sim/estimate', { method: 'POST', body: JSON.stringify({ step }) });
}

export function simRequest(step) {
  return apiFetch('/uber/sim/request', { method: 'POST', body: JSON.stringify({ step }) });
}

export function simRace(step) {
  return apiFetch('/uber/sim/race', { method: 'POST', body: JSON.stringify({ step }) });
}

export function simVerifyOtp(otp, step) {
  return apiFetch('/uber/sim/verify-otp', { method: 'POST', body: JSON.stringify({ otp, step }) });
}

export function simArrive(step) {
  return apiFetch('/uber/sim/arrive', { method: 'POST', body: JSON.stringify({ step }) });
}

export function simComplete(step) {
  return apiFetch('/uber/sim/complete', { method: 'POST', body: JSON.stringify({ step }) });
}

export function simGetEvents() {
  return apiFetch('/uber/sim/events');
}

export function simGetSnapshot() {
  return apiFetch('/uber/sim/snapshot');
}
