import { useCallback, useEffect, useRef, useState } from 'react';

// A status banner (or short-lived visual flag) that clears itself. Each new
// value cancels the previous timer (so an older timer can never wipe a newer
// value early), the timer is cancelled on unmount, and error messages stay
// until replaced so a user has time to read what went wrong. A per-call
// `ms` of 0 holds the value until the next call.
export function useTransientMessage(empty = null, duration = 4000) {
  const [message, setMessage] = useState(empty);
  const timer = useRef(null);
  const emptyValue = useRef(empty);

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => cancel, []);

  const show = useCallback((value, ms = duration) => {
    cancel();
    setMessage(value);
    const isError = value && typeof value === 'object' && (value.type === 'error' || value.kind === 'error');
    if (value && !isError && ms > 0) {
      timer.current = setTimeout(() => {
        timer.current = null;
        setMessage(emptyValue.current);
      }, ms);
    }
  }, [duration]);

  const clear = useCallback(() => {
    cancel();
    setMessage(emptyValue.current);
  }, []);

  return [message, show, clear];
}
