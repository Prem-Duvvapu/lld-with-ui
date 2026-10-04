// @vitest-environment happy-dom
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecordedTrace } from '../hooks/useRecordedTrace';
import TtlCacheReplay from '../lld/ttl-cache/TtlCacheReplay';
import BloomFilterReplay from '../lld/bloom-filter/BloomFilterReplay';
import * as ttl from '../lld/ttl-cache/api';
import * as bloom from '../lld/bloom-filter/api';

vi.mock('../lld/ttl-cache/api');
vi.mock('../lld/bloom-filter/api');

const recording = { runId: 'run-1', trace: [{ sequence: 1 }, { sequence: 2 }, { sequence: 3 }] };
const ttlRecording = {
  runId: 'ttl-run', sweepIntervalMillis: 600, durationMillis: 6100, totalPuts: 2, totalGets: 2, finalCacheSize: 0,
  trace: [
    { sequence: 1, elapsedNanos: 0, threadName: 'driver', type: 'PUT', key: 'session', value: 'token', ttlMillis: 100, cacheSize: 1 },
    { sequence: 2, elapsedNanos: 50000000, threadName: 'driver', type: 'GET_HIT', key: 'session', value: 'token', cacheSize: 1 },
    { sequence: 3, elapsedNanos: 600000000, threadName: 'sweeper', type: 'BACKGROUND_EVICTION', key: 'session', cacheSize: 0 },
    { sequence: 4, elapsedNanos: 650000000, threadName: 'driver', type: 'PUT', key: 'persistent', value: 'value', ttlMillis: 5000, cacheSize: 1 },
    { sequence: 5, elapsedNanos: 5750000000, threadName: 'driver', type: 'GET_MISS_EXPIRED', key: 'persistent', cacheSize: 0 },
  ],
};
const bloomRecording = {
  runId: 'bloom-run', bitSize: 128, hashCount: 3, addThreads: 2, durationMillis: 20, bitsSetCount: 1,
  itemsAdded: ['apple'], falsePositiveDemonstrated: false,
  queries: [{ item: 'apple', wasAdded: true, mightContain: true, falsePositive: false }, { item: 'absent', wasAdded: false, mightContain: false, falsePositive: false }],
  trace: [
    { sequence: 1, elapsedNanos: 0, threadName: 'adder-1', type: 'ADD_ATTEMPT', item: 'apple', bitIndex: -1 },
    { sequence: 2, elapsedNanos: 1000, threadName: 'adder-1', type: 'BIT_NEWLY_SET', item: 'apple', bitIndex: 70 },
    { sequence: 3, elapsedNanos: 2000, threadName: 'adder-1', type: 'ADD_COMPLETE', item: 'apple', bitIndex: -1 },
    { sequence: 4, elapsedNanos: 3000, threadName: 'query-driver', type: 'QUERY_ATTEMPT', item: 'absent', bitIndex: -1 },
    { sequence: 5, elapsedNanos: 4000, threadName: 'query-driver', type: 'QUERY_BIT_MISS', item: 'absent', bitIndex: 0 },
    { sequence: 6, elapsedNanos: 5000, threadName: 'query-driver', type: 'QUERY_RESULT_NEGATIVE', item: 'absent', bitIndex: -1 },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  ttl.runTtlCache.mockResolvedValue(structuredClone(ttlRecording));
  bloom.runBloomFilter.mockResolvedValue(structuredClone(bloomRecording));
});
afterEach(() => vi.useRealTimers());

describe('Recorded trace lifecycle', () => {
  it('selects an events collection without changing the response schema or accepting a different collection', async () => {
    const response = { runId: 'ordering', events: [{ sequence: 1 }], trace: [{ sequence: 9 }] };
    const execute = vi.fn().mockResolvedValueOnce(response).mockResolvedValueOnce({ trace: [] });
    const { result } = renderHook(() => useRecordedTrace(execute, { traceKey: 'events' }));
    await act(async () => { await result.current.run({}); });
    expect(result.current.result).toBe(response);
    expect(result.current.trace).toBe(response.events);
    act(() => result.current.next());
    expect(result.current.done).toBe(true);
    await act(async () => { await result.current.run({}); });
    expect(result.current.error).toContain('did not return a recorded trace');
    expect(result.current.result).toBe(response);
    expect(result.current.position).toBe(1);
  });

  it('serializes runs and loads a paused recording without applying events', async () => {
    let finish;
    const execute = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    const { result } = renderHook(() => useRecordedTrace(execute));
    act(() => { void result.current.run({ size: 1 }); void result.current.run({ size: 2 }); });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(true);
    await act(async () => { finish(recording); });
    expect(result.current.position).toBe(0);
    expect(result.current.playing).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('plays, pauses, seeks, rewinds, and changes speed without more backend requests', async () => {
    vi.useFakeTimers();
    const execute = vi.fn().mockResolvedValue(recording);
    const { result } = renderHook(() => useRecordedTrace(execute));
    await act(async () => { await result.current.run({}); });
    act(() => result.current.play());
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    expect(result.current.position).toBe(1);
    act(() => result.current.pause());
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(result.current.position).toBe(1);
    act(() => { result.current.setSpeed(2); result.current.play(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(result.current.position).toBe(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(result.current.done).toBe(true);
    expect(result.current.playing).toBe(false);
    act(() => result.current.rewind());
    expect(result.current.position).toBe(0);
    act(() => { result.current.next(); result.current.next(); });
    expect(result.current.position).toBe(2);
    act(() => result.current.previous());
    expect(result.current.position).toBe(1);
    act(() => result.current.seek(999));
    expect(result.current.position).toBe(3);
    act(() => result.current.seek(-1));
    expect(result.current.position).toBe(0);
    act(() => result.current.seek('invalid'));
    expect(result.current.position).toBe(0);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('preserves a previous recording after a failed new run and never retries automatically', async () => {
    const execute = vi.fn().mockResolvedValueOnce(recording).mockRejectedValueOnce(new Error('Server refused parameters'));
    const { result } = renderHook(() => useRecordedTrace(execute));
    await act(async () => { await result.current.run({}); });
    act(() => result.current.seek(2));
    await act(async () => { await result.current.run({ size: 2 }); });
    expect(result.current.error).toBe('Server refused parameters');
    expect(result.current.result).toBe(recording);
    expect(result.current.position).toBe(2);
    act(() => result.current.next());
    expect(result.current.done).toBe(true);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('aborts on unmount and ignores a late response without starting a replay timer', async () => {
    vi.useFakeTimers();
    let finish;
    let signal;
    const execute = vi.fn((parameters, options) => { signal = options.signal; return new Promise(resolve => { finish = resolve; }); });
    const { result, unmount } = renderHook(() => useRecordedTrace(execute));
    act(() => { void result.current.run({}); });
    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => { finish(recording); });
    expect(result.current.result).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears scheduled replay work when a loaded recording unmounts', async () => {
    vi.useFakeTimers();
    const execute = vi.fn().mockResolvedValue(recording);
    const { result, unmount } = renderHook(() => useRecordedTrace(execute));
    await act(async () => { await result.current.run({}); });
    act(() => result.current.play());
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('can stop waiting, start a new independent run, and discard the old late response', async () => {
    let finishOld;
    const execute = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; })).mockResolvedValueOnce({ ...recording, runId: 'new-run' });
    const { result } = renderHook(() => useRecordedTrace(execute));
    act(() => { void result.current.run({}); });
    const oldSignal = execute.mock.calls[0][1].signal;
    act(() => result.current.stopWaiting());
    expect(oldSignal.aborted).toBe(true);
    expect(result.current.error).toContain('backend may still finish');
    await act(async () => { await result.current.run({}); finishOld(recording); });
    expect(result.current.result.runId).toBe('new-run');
    expect(result.current.error).toBe('');
  });

  it('handles empty recordings and rejects malformed trace responses', async () => {
    const execute = vi.fn().mockResolvedValueOnce({ runId: 'empty', trace: [] }).mockResolvedValueOnce({ trace: null });
    const { result } = renderHook(() => useRecordedTrace(execute));
    await act(async () => { await result.current.run({}); });
    act(() => { result.current.play(); result.current.next(); });
    expect(result.current.done).toBe(true);
    expect(result.current.playing).toBe(false);
    await act(async () => { await result.current.run({}); });
    expect(result.current.error).toContain('did not return a recorded trace');
    expect(result.current.result.runId).toBe('empty');
  });
});

async function runExperiment() {
  fireEvent.submit(screen.getByRole('button', { name: 'Run backend experiment' }).closest('form'));
  await waitFor(() => expect(screen.getByText(/Paused · 0\//)).toBeTruthy());
}

describe('TTL recorded-state UI', () => {
  it('validates inputs and removes entries only on recorded events, including backward seeking', async () => {
    render(<TtlCacheReplay />);
    expect(ttl.runTtlCache).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Sweep interval (ms)'), { target: { value: '' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Run backend experiment' }).closest('form'));
    expect(ttl.runTtlCache).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Sweep interval (ms)'), { target: { value: '55' } });
    await runExperiment();
    expect(ttl.runTtlCache.mock.calls[0][0]).toEqual({ sweepIntervalMillis: 55 });
    fireEvent.click(screen.getByRole('button', { name: 'Next event' }));
    expect(screen.getByRole('heading', { name: 'session' })).toBeTruthy();
    vi.useFakeTimers();
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(screen.getByRole('heading', { name: 'session' })).toBeTruthy();
    vi.useRealTimers();
    fireEvent.change(screen.getByLabelText(/Applied events:/), { target: { value: '3' } });
    expect(screen.queryByRole('heading', { name: 'session' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Previous event' }));
    expect(screen.getByRole('heading', { name: 'session' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show final state' }));
    expect(screen.getByRole('progressbar').value).toBe(5);
    fireEvent.click(screen.getByRole('button', { name: 'Rewind recording' }));
    expect(screen.getByRole('progressbar').value).toBe(0);
    expect(ttl.runTtlCache).toHaveBeenCalledTimes(1);
  });

  it('preserves the last recording and actual run parameters after a domain error', async () => {
    render(<TtlCacheReplay />);
    await runExperiment();
    ttl.runTtlCache.mockRejectedValueOnce(new Error('Invalid sweep interval from backend'));
    fireEvent.change(screen.getByLabelText('Sweep interval (ms)'), { target: { value: '55' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Run backend experiment' }).closest('form'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Invalid sweep interval from backend'));
    expect(screen.getByText('Run ttl-run · actual sweep interval: 600 ms')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next event' }));
    expect(screen.getByRole('heading', { name: 'session' })).toBeTruthy();
    expect(ttl.runTtlCache).toHaveBeenCalledTimes(2);
  });
});

describe('Bloom recorded-state UI', () => {
  it('does not allocate a bit array from invalid draft values and limits large arrays to 64 visible bits', async () => {
    render(<BloomFilterReplay />);
    fireEvent.change(screen.getByLabelText('Bit size'), { target: { value: '-1' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Run backend experiment' }).closest('form'));
    expect(bloom.runBloomFilter).not.toHaveBeenCalled();
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    fireEvent.change(screen.getByLabelText('Bit size'), { target: { value: '128' } });
    await runExperiment();
    expect(screen.getAllByRole('img')).toHaveLength(64);
    fireEvent.click(screen.getByRole('button', { name: 'Next event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next event' }));
    expect(screen.getByRole('img', { name: 'Bit 70: 1, current event' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next event' }));
    expect(screen.getByRole('img', { name: 'Bit 70: 1' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Previous bits' }));
    expect(screen.getByRole('img', { name: 'Bit 0: 0' })).toBeTruthy();
    expect(screen.getByLabelText('Follow current bit').checked).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Show final state' }));
    expect(screen.getByText(/did not demonstrate a false positive/)).toBeTruthy();
    expect(bloom.runBloomFilter).toHaveBeenCalledTimes(1);
  });

  it('paginates the full trace while keeping upcoming events distinct from applied events', async () => {
    bloom.runBloomFilter.mockResolvedValueOnce({ ...bloomRecording, trace: Array.from({ length: 60 }, (_, index) => ({ sequence: index + 1, elapsedNanos: index * 1000, threadName: 'adder-1', type: 'ADD_ATTEMPT', item: `word-${index}`, bitIndex: -1 })) });
    render(<BloomFilterReplay />);
    await runExperiment();
    const details = screen.getByText('Full backend recording · 60 events').closest('details');
    await act(async () => {
      details.open = true;
      fireEvent(details, new Event('toggle'));
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    await waitFor(() => expect(screen.getByText('Page 1 of 3')).toBeTruthy());
    expect(details.querySelectorAll('li')).toHaveLength(25);
    fireEvent.click(screen.getByRole('button', { name: 'Next log page' }));
    expect(screen.getByText('Page 2 of 3')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show final state' }));
    fireEvent.click(screen.getByRole('button', { name: 'Current event page' }));
    expect(screen.getByText('Page 3 of 3')).toBeTruthy();
    expect(details.querySelectorAll('li')).toHaveLength(10);
    expect(details.querySelector('[aria-current="step"]').textContent).toContain('#60');
    expect(bloom.runBloomFilter).toHaveBeenCalledTimes(1);
  });
});
