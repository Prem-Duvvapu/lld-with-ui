import { apiFetch } from '../../utils/api';

export function getGates() {
  return apiFetch('/parking/gates');
}

export function vehicleEntry(gateId, vehicleNumber, vehicleType, strategy = 'NEAREST') {
  return apiFetch('/parking/entry', {
    method: 'POST',
    body: JSON.stringify({ gateId, vehicleNumber, vehicleType, strategy }),
  });
}

export function scanVehicleExit(gateId, ticketNumber, pricingStrategy = 'HOURLY') {
  return apiFetch('/parking/exit/scan', {
    method: 'POST',
    body: JSON.stringify({ gateId, ticketNumber, pricingStrategy }),
  });
}

export function payVehicleExit(gateId, ticketNumber, pricingStrategy = 'HOURLY', paymentMethod = 'UPI') {
  return apiFetch('/parking/exit/pay', {
    method: 'POST',
    body: JSON.stringify({ gateId, ticketNumber, pricingStrategy, paymentMethod }),
  });
}

export function vehicleExit(gateId, ticketNumber) {
  return apiFetch('/parking/exit', {
    method: 'POST',
    body: JSON.stringify({ gateId, ticketNumber }),
  });
}

export function getFloors() {
  return apiFetch('/parking/floors');
}

export function getActiveTickets() {
  return apiFetch('/parking/tickets/active');
}

export function getAvailableSpots(vehicleType) {
  const params = vehicleType ? `?vehicleType=${vehicleType}` : '';
  return apiFetch(`/parking/spots/available${params}`);
}

// ---------------------------------------------------------- isolated /sim/* sandbox

export function simReset() {
  return apiFetch('/parking/sim/reset', { method: 'POST' });
}

export function simEntry(vehicleNumber, vehicleType, strategy = 'NEAREST') {
  return apiFetch('/parking/sim/entry', {
    method: 'POST',
    body: JSON.stringify({ vehicleNumber, vehicleType, strategy }),
  });
}

export function simScan(ticketNumber, pricingStrategy = 'HOURLY') {
  return apiFetch('/parking/sim/scan', {
    method: 'POST',
    body: JSON.stringify({ ticketNumber, pricingStrategy }),
  });
}

export function simPay(ticketNumber, pricingStrategy = 'HOURLY', paymentMethod = 'UPI') {
  return apiFetch('/parking/sim/pay', {
    method: 'POST',
    body: JSON.stringify({ ticketNumber, pricingStrategy, paymentMethod }),
  });
}

export function simState() {
  return apiFetch('/parking/sim/state');
}

export function simEvents() {
  return apiFetch('/parking/sim/events');
}
