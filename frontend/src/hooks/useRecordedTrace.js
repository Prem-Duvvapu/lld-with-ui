import { useEffect, useRef, useState } from 'react';

export function useRecordedTrace(executeRun, { traceKey = 'trace' } = {}) {
  const [result, setResult] = useState(null);
  const [position, setPosition] = useState(0);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState('');
  const lifecycle = useRef({ mounted: true, locked: false, generation: 0, request: null });
  const trace = result?.[traceKey] || [];

  useEffect(() => {
    const state = lifecycle.current;
    state.mounted = true;
    return () => {
      state.mounted = false;
      state.generation++;
      state.request?.abort();
    };
  }, []);

  const run = async parameters => {
    const state = lifecycle.current;
    if (!state.mounted || state.locked) return;
    state.locked = true;
    const runGeneration = ++state.generation;
    const controller = new AbortController();
    state.request = controller;
    setLoading(true);
    setPlaying(false);
    setError('');
    try {
      const response = await executeRun(parameters, { signal: controller.signal });
      if (!state.mounted || runGeneration !== state.generation) return;
      if (!Array.isArray(response?.[traceKey])) throw new Error('The backend did not return a recorded trace.');
      setResult(response);
      setPosition(0);
    } catch (cause) {
      if (state.mounted && runGeneration === state.generation) setError(cause?.message || 'Could not load the recording.');
    } finally {
      if (runGeneration === state.generation) {
        state.locked = false;
        state.request = null;
        if (state.mounted) setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!playing || loading || position >= trace.length) return undefined;
    const timer = setTimeout(() => {
      setPosition(position + 1);
      if (position + 1 === trace.length) setPlaying(false);
    }, 700 / speed);
    return () => clearTimeout(timer);
  }, [playing, loading, position, trace.length, speed]);

  const seek = value => {
    if (loading || !result || !Number.isFinite(Number(value))) return;
    setPlaying(false);
    setPosition(Math.max(0, Math.min(trace.length, Math.floor(Number(value)))));
  };
  const step = direction => {
    if (loading || !result) return;
    setPlaying(false);
    setPosition(current => Math.max(0, Math.min(trace.length, current + direction)));
  };
  const stopWaiting = () => {
    const state = lifecycle.current;
    if (!state.locked) return;
    state.generation++;
    state.request?.abort();
    state.request = null;
    state.locked = false;
    setLoading(false);
    setPlaying(false);
    setError('Stopped waiting for this run. The backend may still finish it; its response will not be applied.');
  };

  return {
    result, trace, position, loading, playing, speed, error, run, seek, stopWaiting,
    done: Boolean(result) && position === trace.length,
    next: () => step(1), previous: () => step(-1), rewind: () => seek(0),
    play: () => { if (result && !loading && position < trace.length) setPlaying(true); },
    pause: () => setPlaying(false),
    setSpeed: value => { if ([0.5, 1, 2].includes(value)) setSpeed(value); },
  };
}
