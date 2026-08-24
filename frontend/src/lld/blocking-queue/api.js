import { apiFetch } from '../../utils/api';

/**
 * Runs a real bounded-blocking-queue simulation on the backend: genuine
 * producer/consumer threads contending on a ReentrantLock + Condition queue.
 * Returns the full ordered, timestamped execution trace once the run finishes.
 */
export function runBlockingQueue({ capacity, producers, consumers, itemsPerProducer } = {}) {
  return apiFetch('/concurrency/blocking-queue/run', {
    method: 'POST',
    body: JSON.stringify({ capacity, producers, consumers, itemsPerProducer }),
  });
}
