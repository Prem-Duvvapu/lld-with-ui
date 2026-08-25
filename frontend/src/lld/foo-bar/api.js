import { apiFetch } from '../../utils/api';

/**
 * Runs a real Print-FooBar-Alternately simulation on the backend: two genuine
 * threads contending on a pair of Semaphores in strict ping-pong alternation.
 * Returns the full ordered, timestamped execution trace once the run finishes.
 */
export function runFooBar({ n } = {}) {
  return apiFetch('/concurrency/foo-bar/run', {
    method: 'POST',
    body: JSON.stringify({ n }),
  });
}
