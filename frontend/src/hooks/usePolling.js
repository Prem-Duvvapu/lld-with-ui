import { useEffect, useRef } from 'react';

/**
 * Custom hook for resilient polling with AbortController cleanup.
 * @param {Function} fetchFn Async callback taking an AbortSignal
 * @param {number} intervalMs Polling interval in milliseconds
 * @param {Array} deps Dependency array to restart polling on change
 */
export function usePolling(fetchFn, intervalMs = 5000, deps = []) {
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  useEffect(() => {
    let active = true;
    let timerId = null;
    const controller = new AbortController();

    const executePoll = async () => {
      if (!active) return;
      try {
        await fetchRef.current(controller.signal);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('[usePolling] Poll failed:', err);
        }
      }
    };

    // Execute immediately on mount/deps change
    executePoll();

    // Setup interval
    timerId = setInterval(executePoll, intervalMs);

    return () => {
      active = false;
      if (timerId) clearInterval(timerId);
      controller.abort();
    };
  }, deps);
}
