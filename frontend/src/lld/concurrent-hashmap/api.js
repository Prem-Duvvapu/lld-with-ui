import { apiFetch } from '../../utils/api';

/**
 * Runs a real striped-lock concurrent-map simulation on the backend: genuine
 * threads contending on an array of ReentrantLock-guarded segments, proving no
 * lost updates under concurrent merge() calls and exactly-once computation under
 * racing computeIfAbsent() calls. Returns the full ordered, timestamped execution
 * trace once the run finishes.
 */
export function runConcurrentHashMap({ segments, threads, incrementsPerThread, distinctKeys, computeRacers } = {}) {
  return apiFetch('/concurrency/concurrent-hashmap/run', {
    method: 'POST',
    body: JSON.stringify({ segments, threads, incrementsPerThread, distinctKeys, computeRacers }),
  });
}
