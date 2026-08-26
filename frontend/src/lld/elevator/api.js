import { apiFetch } from '../../utils/api';

export function getElevators() {
  return apiFetch('/elevator/elevators');
}

export function requestElevator(sourceFloor, destinationFloor) {
  return apiFetch('/elevator/request', {
    method: 'POST',
    body: JSON.stringify({ sourceFloor, destinationFloor }),
  });
}

export function selectDestination(elevatorId, destinationFloor) {
  return apiFetch('/elevator/destination', {
    method: 'POST',
    body: JSON.stringify({ elevatorId, destinationFloor }),
  });
}

export function toggleMaintenance(elevatorId, maintenance) {
  return apiFetch('/elevator/maintenance', {
    method: 'POST',
    body: JSON.stringify({ elevatorId, maintenance }),
  });
}

export function getRequests() {
  return apiFetch('/elevator/requests');
}

export function tick() {
  return apiFetch('/elevator/tick', {
    method: 'POST',
  });
}

export function getDispatchPolicy() {
  return apiFetch('/elevator/policy');
}

export function setDispatchPolicy(policy) {
  return apiFetch('/elevator/policy', {
    method: 'POST',
    body: JSON.stringify({ policy }),
  });
}

// =========================================================================
// ISOLATED SIMULATION ENGINE (/api/elevator/sim/*) — a separate sandbox
// instance, so replaying the demo can never corrupt the real elevator bank.
// =========================================================================

export function simReset() {
  return apiFetch('/elevator/sim/reset', { method: 'POST' });
}

export function simRequest(sourceFloor, destinationFloor) {
  return apiFetch('/elevator/sim/request', {
    method: 'POST',
    body: JSON.stringify({ sourceFloor, destinationFloor }),
  });
}

export function simStep() {
  return apiFetch('/elevator/sim/step', { method: 'POST' });
}

export function simMaintenance(elevatorId, maintenance) {
  return apiFetch('/elevator/sim/maintenance', {
    method: 'POST',
    body: JSON.stringify({ elevatorId, maintenance }),
  });
}

export function simGetEvents() {
  return apiFetch('/elevator/sim/events');
}

export function simGetSnapshots() {
  return apiFetch('/elevator/sim/snapshots');
}
