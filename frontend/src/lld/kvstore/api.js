import { apiFetch } from '../../utils/api'

export function set(key, value, ttlSeconds, options = {}) {
  return apiFetch(`/kvstore/${encodeURIComponent(key)}`, {
    ...options,
    method: 'PUT',
    body: JSON.stringify({ value, ttlSeconds }),
  })
}

export function get(key, options = {}) {
  return apiFetch(`/kvstore/${encodeURIComponent(key)}`, options)
}

export function del(key, options = {}) {
  return apiFetch(`/kvstore/${encodeURIComponent(key)}`, { ...options, method: 'DELETE' })
}

export function cas(key, expectedVersion, newValue, options = {}) {
  return apiFetch(`/kvstore/${encodeURIComponent(key)}/cas`, {
    ...options,
    method: 'POST',
    body: JSON.stringify({ expectedVersion, newValue }),
  })
}

// Simulation endpoints
export function simReset(options = {}) {
  return apiFetch('/kvstore/sim/reset', { ...options, method: 'POST' })
}

export function simSet(key, value, ttlSeconds, options = {}) {
  return apiFetch(`/kvstore/sim/${encodeURIComponent(key)}`, {
    ...options, method: 'PUT',
    body: JSON.stringify({ value, ttlSeconds }),
  })
}

export function simGet(key, options = {}) {
  return apiFetch(`/kvstore/sim/${encodeURIComponent(key)}`, options)
}

export function simReplay(options = {}) {
  return apiFetch('/kvstore/sim/replay', { ...options, method: 'POST' })
}

export function simTtlDemo(options = {}) {
  return apiFetch('/kvstore/sim/ttl-demo', { ...options, method: 'POST' })
}

export function simCasRace(workerCount = 8, options = {}) {
  return apiFetch('/kvstore/sim/cas-race', {
    ...options, method: 'POST',
    body: JSON.stringify({ workerCount }),
  })
}

export function simGetEvents(options = {}) {
  return apiFetch('/kvstore/sim/events', options)
}

export function simGetSnapshot(options = {}) {
  return apiFetch('/kvstore/sim/snapshot', options)
}
