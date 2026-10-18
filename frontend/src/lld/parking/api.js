import { apiFetch } from '../../utils/api';

export function getGates(options = {}) {
  return apiFetch('/parking/gates', options);
}

export function vehicleEntry(gateId, vehicleNumber, vehicleType, strategy = 'NEAREST', options = {}) {
  return apiFetch('/parking/entry', {
    ...options,
    method: 'POST',
    body: JSON.stringify({ gateId, vehicleNumber, vehicleType, strategy }),
  });
}

export function scanVehicleExit(gateId, ticketNumber, pricingStrategy = 'HOURLY', options = {}) {
  return apiFetch('/parking/exit/scan', {
    ...options,
    method: 'POST',
    body: JSON.stringify({ gateId, ticketNumber, pricingStrategy }),
  });
}

export function payVehicleExit(gateId, ticketNumber, pricingStrategy = 'HOURLY', paymentMethod = 'UPI', options = {}) {
  return apiFetch('/parking/exit/pay', {
    ...options,
    method: 'POST',
    body: JSON.stringify({ gateId, ticketNumber, pricingStrategy, paymentMethod }),
  });
}

export function vehicleExit(gateId, ticketNumber, options = {}) {
  return apiFetch('/parking/exit', {
    ...options,
    method: 'POST',
    body: JSON.stringify({ gateId, ticketNumber }),
  });
}

export function getFloors(options = {}) {
  return apiFetch('/parking/floors', options);
}

export function getActiveTickets(options = {}) {
  return apiFetch('/parking/tickets/active', options);
}

export function getAvailableSpots(vehicleType, options = {}) {
  const params = vehicleType ? `?vehicleType=${encodeURIComponent(vehicleType)}` : '';
  return apiFetch(`/parking/spots/available${params}`, options);
}

// ---------------------------------------------------------- isolated /sim/* sandbox

export function simReset(options = {}) {
  return apiFetch('/parking/sim/reset', { ...options, method: 'POST' });
}

export function simEntry(vehicleNumber, vehicleType, strategy = 'NEAREST', options = {}) {
  return apiFetch('/parking/sim/entry', {
    ...options,
    method: 'POST',
    body: JSON.stringify({ vehicleNumber, vehicleType, strategy }),
  });
}

export function simScan(ticketNumber, pricingStrategy = 'HOURLY', options = {}) {
  return apiFetch('/parking/sim/scan', {
    ...options,
    method: 'POST',
    body: JSON.stringify({ ticketNumber, pricingStrategy }),
  });
}

export function simPay(ticketNumber, pricingStrategy = 'HOURLY', paymentMethod = 'UPI', options = {}) {
  return apiFetch('/parking/sim/pay', {
    ...options,
    method: 'POST',
    body: JSON.stringify({ ticketNumber, pricingStrategy, paymentMethod }),
  });
}

export function simState(options = {}) {
  return apiFetch('/parking/sim/state', options);
}

export function simEvents(options = {}) {
  return apiFetch('/parking/sim/events', options);
}
