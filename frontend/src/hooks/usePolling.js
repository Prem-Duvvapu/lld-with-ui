import { useEffect, useRef } from 'react';

const MAX_BACKOFF_MS = 30000;

/**
 * Polling that waits for each request to settle before scheduling the next one.
 *
 * The previous implementation used a bare `setInterval`, which fired on schedule whether
 * or not the last request had returned. Against the deployed free-tier backend — which
 * takes ~50s to wake from idle — a page polling at 1s stacked up ~50 hanging requests
 * while showing an indefinite spinner. Three changes:
 *
 *   1. Self-scheduling: the next poll is queued after the previous one settles, so
 *      requests can never overlap however slow the backend is.
 *   2. Backoff: consecutive failures double the delay (capped at 30s) instead of
 *      hammering a backend that is down or still starting. One success resets it.
 *   3. Visibility pause: a hidden tab stops polling and refetches immediately on
 *      return, rather than burning battery and quota in the background.
 *
 * @param {Function} fetchFn Async callback taking an AbortSignal
 * @param {number} intervalMs Base polling interval in milliseconds
 * @param {Array} deps Dependency array to restart polling on change
 */
export function usePolling(fetchFn, intervalMs = 5000, deps = []) {
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  useEffect(() => {
    let active = true;
    let timerId = null;
    let failures = 0;
    const controller = new AbortController();

    const delay = () =>
      failures === 0 ? intervalMs : Math.min(intervalMs * 2 ** failures, MAX_BACKOFF_MS);

    const schedule = () => {
      if (!active || document.hidden) return;
      timerId = setTimeout(executePoll, delay());
    };

    const executePoll = async () => {
      if (!active || document.hidden) return;
      try {
        await fetchRef.current(controller.signal);
        failures = 0;
      } catch (err) {
        if (err.name === 'AbortError') return;
        failures += 1;
        console.error('[usePolling] Poll failed:', err);
      }
      schedule();
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(timerId);
        return;
      }
      // Back in view: whatever is on screen is stale, so refetch now rather than
      // waiting out the remaining interval.
      clearTimeout(timerId);
      failures = 0;
      executePoll();
    };

    executePoll();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      active = false;
      clearTimeout(timerId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      controller.abort();
    };
  }, deps);
}
