import { apiFetch } from '../../utils/api'

export function createCoupon(coupon) {
  return apiFetch('/coupon', {
    method: 'POST',
    body: JSON.stringify(coupon),
  })
}

export function getCoupon(code) {
  return apiFetch(`/coupon/${encodeURIComponent(code)}`)
}

export function apply(code, cartTotal, itemCount, category, isFirstOrder) {
  return apiFetch(`/coupon/${encodeURIComponent(code)}/apply`, {
    method: 'POST',
    body: JSON.stringify({ cartTotal, itemCount, category, isFirstOrder }),
  })
}

// Simulation endpoints
export function simReset() {
  return apiFetch('/coupon/sim/reset', { method: 'POST' })
}

export function simApply(code, cartTotal, itemCount, category, isFirstOrder) {
  return apiFetch(`/coupon/sim/${encodeURIComponent(code)}/apply`, {
    method: 'POST',
    body: JSON.stringify({ cartTotal, itemCount, category, isFirstOrder }),
  })
}

export function simRace(code, workerCount = 8) {
  return apiFetch(`/coupon/sim/${encodeURIComponent(code)}/race`, {
    method: 'POST',
    body: JSON.stringify({ workerCount }),
  })
}

export function simGetEvents() {
  return apiFetch('/coupon/sim/events')
}

export function simGetSnapshot() {
  return apiFetch('/coupon/sim/snapshot')
}
