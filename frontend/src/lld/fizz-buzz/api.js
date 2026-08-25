import { apiFetch } from '../../utils/api';

/**
 * Runs a real multithreaded FizzBuzz simulation on the backend: four genuine
 * threads (number, fizz, buzz, fizzbuzz) contending on one ReentrantLock +
 * Condition monitor. Returns the full ordered, timestamped execution trace once
 * the run finishes.
 */
export function runFizzBuzz({ n } = {}) {
  return apiFetch('/concurrency/fizz-buzz/run', {
    method: 'POST',
    body: JSON.stringify({ n }),
  });
}
