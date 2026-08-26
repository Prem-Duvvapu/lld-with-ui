import { apiFetch } from '../../utils/api';

/**
 * Runs a real Bloom filter simulation on the backend: genuine adder threads
 * concurrently add a fixed deterministic word batch into a shared BitSet guarded
 * by a ReentrantLock, then the service deterministically hunts down a genuine
 * false positive. Returns the full ordered, timestamped execution trace plus the
 * query outcomes (true positives, true negatives, false positive) once the run
 * finishes.
 */
export function runBloomFilter({ bitSize, hashCount, addThreads } = {}) {
  return apiFetch('/concurrency/bloom-filter/run', {
    method: 'POST',
    body: JSON.stringify({ bitSize, hashCount, addThreads }),
  });
}
