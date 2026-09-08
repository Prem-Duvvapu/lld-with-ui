import { apiFetch } from '../../utils/api'

export function configure(maximumSize, evictionPolicy, ttlSeconds, withStats, shardCount) {
  return apiFetch('/cachelibrary/configure', {
    method: 'POST',
    body: JSON.stringify({ maximumSize, evictionPolicy, ttlSeconds, withStats, shardCount }),
  })
}

export function getConfig() {
  return apiFetch('/cachelibrary/configure')
}

export function put(key, value) {
  return apiFetch(`/cachelibrary/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  })
}

export function get(key) {
  return apiFetch(`/cachelibrary/${encodeURIComponent(key)}`)
}

export function getStats() {
  return apiFetch('/cachelibrary/stats')
}

// Simulation endpoints
export function simReset() {
  return apiFetch('/cachelibrary/sim/reset', { method: 'POST' })
}

export function simConfigure(maximumSize, evictionPolicy, ttlSeconds, withStats, shardCount) {
  return apiFetch('/cachelibrary/sim/configure', {
    method: 'POST',
    body: JSON.stringify({ maximumSize, evictionPolicy, ttlSeconds, withStats, shardCount }),
  })
}

export function simPut(key, value) {
  return apiFetch(`/cachelibrary/sim/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  })
}

export function simGet(key) {
  return apiFetch(`/cachelibrary/sim/${encodeURIComponent(key)}`)
}

export function simTtlDemo() {
  return apiFetch('/cachelibrary/sim/ttl-demo', { method: 'POST' })
}

export function simRace(workerCount = 8) {
  return apiFetch('/cachelibrary/sim/race', {
    method: 'POST',
    body: JSON.stringify({ workerCount }),
  })
}

export function simGetEvents() {
  return apiFetch('/cachelibrary/sim/events')
}

export function simGetSnapshot() {
  return apiFetch('/cachelibrary/sim/snapshot')
}
