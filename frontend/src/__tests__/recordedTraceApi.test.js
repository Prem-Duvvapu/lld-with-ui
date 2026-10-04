import { beforeEach, expect, it, vi } from 'vitest';
import { apiFetch } from '../utils/api';
import { runTtlCache } from '../lld/ttl-cache/api';
import { runBloomFilter } from '../lld/bloom-filter/api';

vi.mock('../utils/api', () => ({ apiFetch: vi.fn().mockResolvedValue({ trace: [] }) }));
beforeEach(() => vi.clearAllMocks());

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
