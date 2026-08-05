import { apiFetch } from '../../utils/api';

// --- OPERATIONS / TELEMETRY MAIN CACHE APIs ---
export function getSnapshot() {
  return apiFetch('/lrucache/snapshot');
}

export function getStats() {
  return apiFetch('/lrucache/stats');
}

export function cacheGet(key) {
  return apiFetch(`/lrucache/get/${encodeURIComponent(key)}`);
}

export function cachePut(key, value) {
  return apiFetch('/lrucache/put', {
    method: 'POST',
    body: JSON.stringify({ key, value }),
  });
}

export function cacheRemove(key) {
  return apiFetch(`/lrucache/remove/${encodeURIComponent(key)}`, {
    method: 'DELETE',
  });
}

export function cacheClear() {
  return apiFetch('/lrucache/clear', {
    method: 'POST',
  });
}

export function setCapacity(capacity) {
  return apiFetch('/lrucache/capacity', {
    method: 'POST',
    body: JSON.stringify({ capacity: Number(capacity) }),
  });
}

export function setPolicy(policy) {
  return apiFetch('/lrucache/policy', {
    method: 'POST',
    body: JSON.stringify({ policy }),
  });
}

export function batchSimulate() {
  return apiFetch('/lrucache/batch-simulate', {
    method: 'POST',
  });
}

// --- ISOLATED 2D SIMULATION TAB CACHE APIs ---
export function simGetSnapshot() {
  return apiFetch('/lrucache/sim/snapshot');
}

export function simCacheGet(key) {
  return apiFetch(`/lrucache/sim/get/${encodeURIComponent(key)}`);
}

export function simCachePut(key, value) {
  return apiFetch('/lrucache/sim/put', {
    method: 'POST',
    body: JSON.stringify({ key, value }),
  });
}

export function simCacheRemove(key) {
  return apiFetch(`/lrucache/sim/remove/${encodeURIComponent(key)}`, {
    method: 'DELETE',
  });
}

export function simCacheClear() {
  return apiFetch('/lrucache/sim/clear', {
    method: 'POST',
  });
}

export function simSetCapacity(capacity) {
  return apiFetch('/lrucache/sim/capacity', {
    method: 'POST',
    body: JSON.stringify({ capacity: Number(capacity) }),
  });
}

export function simSetPolicy(policy) {
  return apiFetch('/lrucache/sim/policy', {
    method: 'POST',
    body: JSON.stringify({ policy }),
  });
}

export function simBatchSimulate() {
  return apiFetch('/lrucache/sim/batch-simulate', {
    method: 'POST',
  });
}
