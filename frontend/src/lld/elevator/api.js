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

export function getRequests() {
  return apiFetch('/elevator/requests');
}

export function tick() {
  return apiFetch('/elevator/tick', {
    method: 'POST',
  });
}
