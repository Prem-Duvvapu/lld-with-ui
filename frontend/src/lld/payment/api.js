import { apiFetch } from '../../utils/api'

export function charge(idempotencyKey, payerId, amount, method) {
  return apiFetch('/payment/charge', {
    method: 'POST',
    body: JSON.stringify({ idempotencyKey, payerId, amount, method }),
  })
}

export function getPayment(paymentId) {
  return apiFetch(`/payment/${paymentId}`)
}

export function refund(paymentId) {
  return apiFetch(`/payment/${paymentId}/refund`, { method: 'POST' })
}

// Simulation endpoints
export function simReset() {
  return apiFetch('/payment/sim/reset', { method: 'POST' })
}

export function simCharge(idempotencyKey, payerId, amount, method) {
  return apiFetch('/payment/sim/charge', {
    method: 'POST',
    body: JSON.stringify({ idempotencyKey, payerId, amount, method }),
  })
}

export function simRefund(paymentId) {
  return apiFetch(`/payment/sim/${paymentId}/refund`, { method: 'POST' })
}

export function simRace(idempotencyKey, payerId, amount, method, attempts = 6) {
  return apiFetch('/payment/sim/race', {
    method: 'POST',
    body: JSON.stringify({ idempotencyKey, payerId, amount, method, attempts }),
  })
}

export function simGetEvents() {
  return apiFetch('/payment/sim/events')
}

export function simGetSnapshot() {
  return apiFetch('/payment/sim/snapshot')
}
