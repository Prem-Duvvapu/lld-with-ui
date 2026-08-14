import { apiFetch } from '../../utils/api';

export function getElevators() {
  return apiFetch('/elevator/elevators');
}

export function requestElevator(fromFloor, toFloor) {
  return apiFetch('/elevator/request', {
    method: 'POST',
    body: JSON.stringify({ fromFloor, toFloor }),
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

// Simulation Endpoints
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
