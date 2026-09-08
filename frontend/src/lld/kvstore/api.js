import { apiFetch } from '../../utils/api'

export function set(key, value, ttlSeconds) {
  return apiFetch(`/kvstore/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value, ttlSeconds }),
  })
}

export function get(key) {
  return apiFetch(`/kvstore/${encodeURIComponent(key)}`)
}

export function del(key) {
  return apiFetch(`/kvstore/${encodeURIComponent(key)}`, { method: 'DELETE' })
}

export function cas(key, expectedVersion, newValue) {
  return apiFetch(`/kvstore/${encodeURIComponent(key)}/cas`, {
    method: 'POST',
    body: JSON.stringify({ expectedVersion, newValue }),
  })
}

// Simulation endpoints
export function simReset() {
  return apiFetch('/kvstore/sim/reset', { method: 'POST' })
}

export function simSet(key, value, ttlSeconds) {
  return apiFetch(`/kvstore/sim/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value, ttlSeconds }),
  })
}

export function simGet(key) {
  return apiFetch(`/kvstore/sim/${encodeURIComponent(key)}`)
}

export function simReplay() {
  return apiFetch('/kvstore/sim/replay', { method: 'POST' })
}

export function simTtlDemo() {
  return apiFetch('/kvstore/sim/ttl-demo', { method: 'POST' })
}

export function simCasRace(workerCount = 8) {
  return apiFetch('/kvstore/sim/cas-race', {
    method: 'POST',
    body: JSON.stringify({ workerCount }),
  })
}

export function simGetEvents() {
  return apiFetch('/kvstore/sim/events')
}

export function simGetSnapshot() {
  return apiFetch('/kvstore/sim/snapshot')
}
