import { apiFetch } from '../../utils/api';

/**
 * Runs a real Building-H2O simulation on the backend: genuine hydrogen/oxygen
 * threads contending on a Semaphore-bounded CyclicBarrier. Returns the full
 * ordered, timestamped execution trace once the run finishes.
 */
export function runH2O({ moleculeCount } = {}) {
  return apiFetch('/concurrency/h2o/run', {
    method: 'POST',
    body: JSON.stringify({ moleculeCount }),
  });
}
