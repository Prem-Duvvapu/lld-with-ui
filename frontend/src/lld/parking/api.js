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

export function getParkingClassDiagram() {
  return apiFetch('/parking/class-diagram');
}

export function getParkingDesignDetails() {
  return apiFetch('/parking/design-details');
}
