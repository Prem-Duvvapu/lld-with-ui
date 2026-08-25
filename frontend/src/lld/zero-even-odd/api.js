import { apiFetch } from '../../utils/api';

/**
 * Runs a real Print-Zero-Even-Odd simulation on the backend: three genuine
 * threads (zero, odd, even) contending on three Semaphores. Returns the full
 * ordered, timestamped execution trace once the run finishes.
 */
export function runZeroEvenOdd({ n } = {}) {
  return apiFetch('/concurrency/zero-even-odd/run', {
    method: 'POST',
    body: JSON.stringify({ n }),
  });
}
