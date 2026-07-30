const BASE_URL = '/api/parking';

export async function getGates() {
  const res = await fetch(`${BASE_URL}/gates`);
  return res.json();
}

export async function vehicleEntry(gateId, vehicleNumber, vehicleType, strategy = 'NEAREST') {
  const res = await fetch(`${BASE_URL}/entry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gateId, vehicleNumber, vehicleType, strategy }),
  });
  return res.json();
}

export async function scanVehicleExit(gateId, ticketNumber, pricingStrategy = 'HOURLY') {
  const res = await fetch(`${BASE_URL}/exit/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gateId, ticketNumber, pricingStrategy }),
  });
  return res.json();
}

export async function payVehicleExit(gateId, ticketNumber, pricingStrategy = 'HOURLY', paymentMethod = 'UPI') {
  const res = await fetch(`${BASE_URL}/exit/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gateId, ticketNumber, pricingStrategy, paymentMethod }),
  });
  return res.json();
}

export async function vehicleExit(gateId, ticketNumber) {
  const res = await fetch(`${BASE_URL}/exit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gateId, ticketNumber }),
  });
  return res.json();
}

export async function getFloors() {
  const res = await fetch(`${BASE_URL}/floors`);
  return res.json();
}

export async function getActiveTickets() {
  const res = await fetch(`${BASE_URL}/tickets/active`);
  return res.json();
}

export async function getAvailableSpots(vehicleType) {
  const params = vehicleType ? `?vehicleType=${vehicleType}` : '';
  const res = await fetch(`${BASE_URL}/spots/available${params}`);
  return res.json();
}
