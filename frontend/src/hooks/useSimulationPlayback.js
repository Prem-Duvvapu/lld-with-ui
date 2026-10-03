import { useCallback, useEffect, useRef, useState } from 'react';

export function useSimulationPlayback(stepCount, executeStep) {
  const [completed, setCompleted] = useState(0);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const locked = useRef(false);
  const count = useRef(0);
  const failed = useRef(false);
  const latestResult = useRef(null);
  const executor = useRef(executeStep);

  useEffect(() => { executor.current = executeStep; }, [executeStep]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const run = useCallback(async (reset = false) => {
    if (!mounted.current || locked.current || (!reset && (failed.current || count.current >= stepCount))) return;
    locked.current = true;
    setBusy(true);
    if (reset) setPlaying(false);
    setError('');
    const index = reset ? 0 : count.current;
    try {
      const response = await executor.current(index, reset ? null : latestResult.current);
      if (!mounted.current) return;
      latestResult.current = response;
      count.current = index + 1;
      failed.current = false;
      setResult(response);
      setCompleted(index + 1);
      if (index + 1 === stepCount) setPlaying(false);
    } catch (cause) {
      if (!mounted.current) return;
      failed.current = true;
      setPlaying(false);
      setError(cause?.message || 'Simulation request failed.');
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [stepCount]);

  useEffect(() => {
    if (!playing || busy || error || completed >= stepCount) return undefined;
    const timer = setTimeout(() => { void run(); }, 1600 / speed);
    return () => clearTimeout(timer);
  }, [playing, busy, error, completed, stepCount, speed, run]);

  return {
    completed, result, busy, playing, speed, error,
    done: completed === stepCount,
    next: () => { setPlaying(false); return run(); },
    reset: () => run(true),
    play: () => { if (!failed.current && count.current < stepCount) setPlaying(true); },
    pause: () => setPlaying(false),
    setSpeed: value => { if ([0.5, 1, 2].includes(value)) setSpeed(value); },
  };
}
