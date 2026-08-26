import { apiFetch } from '../../utils/api';

/**
 * Runs a real parallel merge sort on the backend: a genuine ForkJoinPool +
 * RecursiveAction divide-and-conquer sort with an explicit parallelism level.
 * Returns the full ordered, timestamped, thread-attributed execution trace once
 * the sort finishes.
 */
export function runMergeSort({ array, size, parallelism, sequentialThreshold } = {}) {
  return apiFetch('/concurrency/merge-sort/run', {
    method: 'POST',
    body: JSON.stringify({ array, size, parallelism, sequentialThreshold }),
  });
}
