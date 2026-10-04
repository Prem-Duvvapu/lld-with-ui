import { apiFetch } from '../../utils/api';

/**
 * Runs a real Print-Zero-Even-Odd simulation on the backend: three genuine
 * threads (zero, odd, even) contending on three Semaphores. Returns the full
 * ordered, timestamped execution trace once the run finishes.
 */
export function runZeroEvenOdd({ n } = {}, { signal } = {}) {
  return apiFetch('/concurrency/zero-even-odd/run', {
    method: 'POST',
    signal,
    body: JSON.stringify({ n }),
  });
}
