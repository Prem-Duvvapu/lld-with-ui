import { apiFetch } from '../../utils/api';

/**
 * Runs a real TTL-cache scenario on the backend: a ConcurrentHashMap-backed cache
 * with a genuine ScheduledExecutorService background sweeper, executing a scripted
 * sequence of puts and gets in real time. Returns the full ordered, timestamped
 * execution trace once the run finishes.
 */
export function runTtlCache({ sweepIntervalMillis, puts, gets, observeMillis } = {}) {
  return apiFetch('/concurrency/ttl-cache/run', {
    method: 'POST',
    body: JSON.stringify({ sweepIntervalMillis, puts, gets, observeMillis }),
  });
}
