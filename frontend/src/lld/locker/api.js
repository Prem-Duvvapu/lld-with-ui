import { apiFetch } from '../../utils/api'

export function getBanks() {
  return apiFetch('/locker/banks')
}

export function getLockersInBank(bankId) {
  return apiFetch(`/locker/banks/${bankId}/lockers`)
}

export function deposit(bankId, size, courierId, recipientId, policy = 'SMALLEST_FIT') {
  return apiFetch('/locker/deposit', {
    method: 'POST',
    body: JSON.stringify({ bankId, size, courierId, recipientId, policy }),
  })
}

export function pickup(pickupCode) {
  return apiFetch('/locker/pickup', {
    method: 'POST',
    body: JSON.stringify({ pickupCode }),
  })
}

// Simulation endpoints
export function simReset() {
  return apiFetch('/locker/sim/reset', { method: 'POST' })
}

export function simDeposit(courierId, recipientId, size, policy = 'SMALLEST_FIT') {
  return apiFetch('/locker/sim/deposit', {
    method: 'POST',
    body: JSON.stringify({ courierId, recipientId, size, policy }),
  })
}

export function simPickup(pickupCode) {
  return apiFetch('/locker/sim/pickup', {
    method: 'POST',
    body: JSON.stringify({ pickupCode }),
  })
}

export function simRace(courierCount, size, policy = 'SMALLEST_FIT') {
  return apiFetch('/locker/sim/race', {
    method: 'POST',
    body: JSON.stringify({ courierCount, size, policy }),
  })
}

export function simGetEvents() {
  return apiFetch('/locker/sim/events')
}

export function simGetSnapshot() {
  return apiFetch('/locker/sim/snapshot')
}
