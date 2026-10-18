import { useCallback, useEffect, useRef, useState } from 'react';
import { usePolling } from '../../hooks/usePolling';

export function useParkingLifecycle() {
  const lifecycle = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    return () => controller.abort();
  }, []);
  return lifecycle;
}

export function useParkingList(fetcher, interval = 5000) {
  const lifecycle = useParkingLifecycle();
  const pending = useRef(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => {
    if (pending.current && !pending.current.signal.aborted) return pending.current.request;
    const signal = lifecycle.current.signal;
    setLoading(true);
    const request = Promise.resolve().then(() => {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      return fetcher({ signal });
    }).then(result => {
      if (signal.aborted) return;
      if (!Array.isArray(result)) throw new Error('The server returned an unexpected list. Try refreshing.');
      setData(result);
      setError('');
    }).catch(cause => {
      if (!signal.aborted) setError(cause.message || 'Could not refresh parking data.');
      throw cause;
    }).finally(() => {
      if (pending.current?.request === request) pending.current = null;
      if (!signal.aborted) setLoading(false);
    });
    pending.current = { signal, request };
    return request;
  }, [fetcher, lifecycle]);
  usePolling(refresh, interval, [refresh, interval]);
  return { data, error, loading, retry: () => { void refresh().catch(() => {}); } };
}

export function useParkingAction() {
  const lifecycle = useParkingLifecycle();
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const clear = () => { setError(''); setUncertain(false); };
  const run = async (operation, onSuccess, uncertaintyNote = '') => {
    if (locked.current) return;
    locked.current = true;
    const signal = lifecycle.current.signal;
    setBusy(true);
    clear();
    try {
      const response = await operation({ signal });
      if (!signal.aborted) onSuccess(response);
    } catch (cause) {
      if (!signal.aborted) {
        const ambiguous = Boolean(uncertaintyNote) && (!cause.status || cause.status >= 500);
        setUncertain(ambiguous);
        setError(`${cause.message || 'The request failed.'}${ambiguous ? ` ${uncertaintyNote}` : ''}`);
      }
    } finally {
      locked.current = false;
      if (!signal.aborted) setBusy(false);
    }
  };
  return { run, busy, error, uncertain, clear };
}
