import { beforeEach, expect, it, vi } from 'vitest';
import { apiFetch } from '../utils/api';
import { runTtlCache } from '../lld/ttl-cache/api';
import { runBloomFilter } from '../lld/bloom-filter/api';
import { runMergeSort } from '../lld/merge-sort/api';
import { runBlockingQueue } from '../lld/blocking-queue/api';
import { runConcurrentHashMap } from '../lld/concurrent-hashmap/api';
import { runFooBar } from '../lld/foo-bar/api';
import { runZeroEvenOdd } from '../lld/zero-even-odd/api';
import { runFizzBuzz } from '../lld/fizz-buzz/api';
import { runH2O } from '../lld/h2o/api';

vi.mock('../utils/api', () => ({ apiFetch: vi.fn().mockResolvedValue({ trace: [] }) }));
beforeEach(() => vi.clearAllMocks());

it.each([
  ['concurrent-hashmap', runConcurrentHashMap, { segments: 2, threads: 3, incrementsPerThread: 4, distinctKeys: 2, computeRacers: 3 }],
  ['foo-bar', runFooBar, { n: 4 }],
  ['zero-even-odd', runZeroEvenOdd, { n: 5 }],
  ['fizz-buzz', runFizzBuzz, { n: 6 }],
  ['h2o', runH2O, { moleculeCount: 7 }],
])('forwards %s parameters and cancellation while preserving no-options calls', async (slug, execute, parameters) => {
  const { signal } = new AbortController();
  await execute(parameters, { signal });
  expect(apiFetch).toHaveBeenLastCalledWith(`/concurrency/${slug}/run`, { method: 'POST', signal, body: JSON.stringify(parameters) });
  await execute();
  expect(apiFetch).toHaveBeenLastCalledWith(`/concurrency/${slug}/run`, { method: 'POST', signal: undefined, body: '{}' });
});

it('forwards TTL run parameters and the caller abort signal', async () => {
  const { signal } = new AbortController();
  await runTtlCache({ sweepIntervalMillis: 55, observeMillis: 500 }, { signal });
  expect(apiFetch).toHaveBeenCalledWith('/concurrency/ttl-cache/run', { method: 'POST', signal, body: JSON.stringify({ sweepIntervalMillis: 55, observeMillis: 500 }) });
});

it('forwards Bloom parameters and keeps existing no-options calls compatible', async () => {
  const { signal } = new AbortController();
  await runBloomFilter({ bitSize: 128, hashCount: 3, addThreads: 2 }, { signal });
  expect(apiFetch).toHaveBeenLastCalledWith('/concurrency/bloom-filter/run', { method: 'POST', signal, body: JSON.stringify({ bitSize: 128, hashCount: 3, addThreads: 2 }) });
  await runBloomFilter();
  expect(apiFetch).toHaveBeenLastCalledWith('/concurrency/bloom-filter/run', { method: 'POST', signal: undefined, body: '{}' });
});

it('forwards merge-sort parameters and caller cancellation without changing no-options calls', async () => {
  const { signal } = new AbortController();
  const parameters = { array: [3, 0, -2], size: 3, parallelism: 2, sequentialThreshold: 1 };
  await runMergeSort(parameters, { signal });
  expect(apiFetch).toHaveBeenLastCalledWith('/concurrency/merge-sort/run', { method: 'POST', signal, body: JSON.stringify(parameters) });
  await runMergeSort();
  expect(apiFetch).toHaveBeenLastCalledWith('/concurrency/merge-sort/run', { method: 'POST', signal: undefined, body: '{}' });
});

it('forwards blocking-queue parameters and caller cancellation without changing no-options calls', async () => {
  const { signal } = new AbortController();
  const parameters = { capacity: 2, producers: 1, consumers: 2, itemsPerProducer: 3 };
  await runBlockingQueue(parameters, { signal });
  expect(apiFetch).toHaveBeenLastCalledWith('/concurrency/blocking-queue/run', { method: 'POST', signal, body: JSON.stringify(parameters) });
  await runBlockingQueue();
  expect(apiFetch).toHaveBeenLastCalledWith('/concurrency/blocking-queue/run', { method: 'POST', signal: undefined, body: '{}' });
});
