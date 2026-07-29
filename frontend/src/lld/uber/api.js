const BASE = '/api/uber';

export async function getEstimate(pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType) {
  const params = new URLSearchParams({ pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType });
  const res = await fetch(`${BASE}/estimate?${params}`);
  return res.json();
}

export async function requestRide(userId, pickupLat, pickupLng, pickupLabel,
                                  dropoffLat, dropoffLng, dropoffLabel, vehicleType) {
  const res = await fetch(`${BASE}/rides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, pickupLat, pickupLng, pickupLabel,
      dropoffLat, dropoffLng, dropoffLabel, vehicleType }),
  });
  return res.json();
}

export async function getRide(id) {
  const res = await fetch(`${BASE}/rides/${id}`);
  return res.json();
}

export async function getUserRides(userId) {
  const res = await fetch(`${BASE}/rides?userId=${userId}`);
  return res.json();
}

export async function updateRideStatus(id, status) {
  const res = await fetch(`${BASE}/rides/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return res.json();
}
