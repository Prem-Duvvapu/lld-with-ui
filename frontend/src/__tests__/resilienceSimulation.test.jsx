// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CircuitBreakerSimulation from '../lld/circuit-breaker/CircuitBreakerSimulation';
import LruCacheSimulation from '../lld/lru-cache/LruCacheSimulation';
import * as circuit from '../lld/circuit-breaker/api';
import * as cache from '../lld/lru-cache/api';

vi.mock('../lld/circuit-breaker/api');
vi.mock('../lld/lru-cache/api');

beforeEach(() => {
  vi.resetAllMocks();
  let breaker;
  let events;
  const circuitSnapshot = () => structuredClone({ breaker, events });
  circuit.simReset.mockImplementation(async () => {
    breaker = { name: 'payment-gateway', phase: 'CLOSED', consecutiveFailures: 0, totalCalls: 0, totalRejections: 0, remainingCooldownMillis: 0 };
    events = [{ id: 1, eventType: 'INITIALIZE', title: 'Cold boot', description: 'Sandbox ready' }];
    return circuitSnapshot();
  });
  circuit.simCall.mockImplementation(async success => {
    let eventType;
    if (breaker.phase === 'OPEN' && breaker.remainingCooldownMillis > 0) {
      breaker.totalRejections++;
      eventType = 'CALL_REJECTED';
    } else {
      breaker.totalCalls++;
      eventType = success ? 'CALL_SUCCEEDED' : 'CALL_FAILED';
      if (success) { breaker.phase = 'CLOSED'; breaker.consecutiveFailures = 0; }
      else if (++breaker.consecutiveFailures >= 3) { breaker.phase = 'OPEN'; breaker.remainingCooldownMillis = 5000; }
    }
    events.push({ id: events.length + 1, eventType, title: 'Backend outcome', description: `Backend phase: ${breaker.phase}` });
    return circuitSnapshot();
  });
  circuit.simAdvanceClock.mockImplementation(async () => {
    breaker.remainingCooldownMillis = 0;
    events.push({ id: events.length + 1, eventType: 'CLOCK_ADVANCED', title: 'Manual clock', description: 'Advanced 5000 ms' });
    return circuitSnapshot();
  });
  circuit.simGetSnapshot.mockImplementation(async () => circuitSnapshot());

  let capacity = 5;
  let policy = 'LRU';
  let entries = [];
  const stats = { hits: 4, misses: 2, evictions: 3, hitRate: 66.7 };
  const logs = [];
  const cacheSnapshot = () => structuredClone({ capacity, policy, size: entries.length, nodes: entries, stats, logs });
  const log = (op, key, status) => logs.unshift({ id: logs.length + 1, op, key, status, detail: `${op} committed on server` });
  cache.simCacheClear.mockImplementation(async () => { entries = []; log('CLEAR', '*', 'CLEARED'); return cacheSnapshot(); });
  cache.simSetCapacity.mockImplementation(async value => {
    capacity = value;
    while (entries.length > capacity) { entries.pop(); stats.evictions++; }
    log('CAPACITY', '*', 'UPDATED'); return cacheSnapshot();
  });
  cache.simSetPolicy.mockImplementation(async value => { policy = value; log('POLICY', '*', 'SWAPPED'); return cacheSnapshot(); });
  cache.simCachePut.mockImplementation(async (key, value) => {
    entries = entries.filter(entry => entry.key !== key);
    entries.unshift({ key, value, accessCount: 0 });
    if (entries.length > capacity) { entries.pop(); stats.evictions++; }
    log('PUT', key, 'STORED'); return cacheSnapshot();
  });
  cache.simCacheGet.mockImplementation(async key => {
    const entry = entries.find(entry => entry.key === key);
    if (entry) {
      stats.hits++; entry.accessCount++;
      if (policy === 'LRU') entries = [entry, ...entries.filter(value => value.key !== key)];
    } else stats.misses++;
    log('GET', key, entry ? 'HIT' : 'MISS');
    return { snapshot: cacheSnapshot(), found: Boolean(entry), value: entry?.value };
  });
  cache.simCacheRemove.mockImplementation(async key => {
    const removed = entries.some(entry => entry.key === key);
    entries = entries.filter(entry => entry.key !== key);
    log('REMOVE', key, 'REMOVED'); return { snapshot: cacheSnapshot(), removed };
  });
  cache.simGetSnapshot.mockImplementation(async () => cacheSnapshot());
  cache.simBatchSimulate.mockImplementation(async () => {
    entries = [{ key: 'sample-key', value: 'sample-value', accessCount: 1 }];
    return cacheSnapshot();
  });
});

async function advance(total) {
  for (let index = 0; index < total; index++) {
    fireEvent.click(screen.getByRole('button', { name: index === 0 ? 'Start simulation' : 'Next step', exact: true }));
    await waitFor(() => expect(screen.getByRole('progressbar').value).toBe(index + 1));
  }
}

describe('Circuit breaker guided playback', () => {
  it('shows clock eligibility without inventing HALF_OPEN and verifies the expected rejection', async () => {
    render(<CircuitBreakerSimulation />);
    expect(circuit.simReset).not.toHaveBeenCalled();
    await advance(6);
    expect(screen.getByText('payment-gateway · OPEN')).toBeTruthy();
    expect(screen.getByText(/Cooldown has elapsed/)).toBeTruthy();
    expect(circuit.simCall.mock.calls).toEqual([[false, 2], [false, 3], [false, 4], [true, 5]]);
    expect(circuit.simAdvanceClock).toHaveBeenCalledWith(5000, 6);
    expect(screen.queryByRole('alert')).toBeNull();
    for (let index = 6; index < 10; index++) {
      fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
      await waitFor(() => expect(screen.getByRole('progressbar').value).toBe(index + 1));
    }
    expect(circuit.simAdvanceClock).toHaveBeenLastCalledWith(5000, 8);
    expect(screen.getByText('payment-gateway · CLOSED')).toBeTruthy();
    expect(circuit.simGetSnapshot).toHaveBeenCalledTimes(1);
    expect(circuit.callService).not.toHaveBeenCalled();
    expect(circuit.resetService).not.toHaveBeenCalled();
  });

  it('stops after a transport error rather than counting it as the expected rejected call', async () => {
    render(<CircuitBreakerSimulation />);
    await advance(4);
    circuit.simCall.mockRejectedValueOnce(new Error('Connection lost'));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Connection lost'));
    expect(screen.getByRole('progressbar').value).toBe(4);
    expect(circuit.simGetSnapshot).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(circuit.simCall).toHaveBeenCalledTimes(4);
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.getByRole('progressbar').value).toBe(1));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('does not advance when a rejection step reports an attempted downstream call', async () => {
    render(<CircuitBreakerSimulation />);
    await advance(4);
    circuit.simCall.mockResolvedValueOnce({ breaker: {}, events: [{ eventType: 'CALL_SUCCEEDED' }] });
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Expected CALL_REJECTED'));
    expect(screen.getByRole('progressbar').value).toBe(4);
    expect(screen.getByText('payment-gateway · OPEN')).toBeTruthy();
  });

  it('keeps clock advancement and trial requests separate when a clock response fails', async () => {
    render(<CircuitBreakerSimulation />);
    await advance(5);
    circuit.simAdvanceClock.mockRejectedValueOnce(new Error('Clock response unavailable'));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Clock response unavailable'));
    expect(circuit.simCall).toHaveBeenCalledTimes(4);
    expect(screen.getByRole('progressbar').value).toBe(5);
  });
});

describe('LRU cache guided playback', () => {
  it('initializes deterministically, commits real ordering, and reports a miss without a database claim', async () => {
    render(<LruCacheSimulation />);
    expect(cache.simCacheClear).not.toHaveBeenCalled();
    expect(cache.simGetSnapshot).not.toHaveBeenCalled();
    await advance(10);
    expect(cache.simSetCapacity).toHaveBeenCalledWith(5);
    expect(cache.simSetPolicy).toHaveBeenCalledWith('LRU');
    expect(cache.simCachePut).toHaveBeenCalledTimes(6);
    expect(cache.simCacheGet.mock.calls).toEqual([['user_session_101'], ['db_product_99']]);
    expect(screen.getByText('Cache miss for db_product_99. No database fallback is performed.')).toBeTruthy();
    expect(screen.getByText('new_order_808')).toBeTruthy();
    expect(screen.queryByText('db_product_99', { exact: true })).toBeNull();
    expect(cache.cachePut).not.toHaveBeenCalled();
    expect(cache.cacheClear).not.toHaveBeenCalled();
    expect(cache.cacheGet).not.toHaveBeenCalled();
  });

  it('keeps manual controls locked until the guide completes', async () => {
    render(<LruCacheSimulation />);
    await advance(1);
    expect(screen.getByRole('group', { name: 'Sandbox experiments' }).disabled).toBe(true);
    fireEvent.submit(screen.getByRole('button', { name: 'Put entry' }).closest('form'));
    expect(cache.simCachePut).not.toHaveBeenCalled();
    expect(screen.getByText(/No cached entries/)).toBeTruthy();
  });

  it('preserves labelled keyboard forms, empty values, policy changes, and capacity experiments', async () => {
    render(<LruCacheSimulation />);
    await advance(10);
    fireEvent.change(screen.getByLabelText('Put key'), { target: { value: '  custom/key  ' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Put entry' }).closest('form'));
    await waitFor(() => expect(screen.getByText('(empty value)')).toBeTruthy());
    expect(cache.simCachePut).toHaveBeenLastCalledWith('custom/key', '');
    fireEvent.change(screen.getByLabelText('Get key'), { target: { value: 'custom/key' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Get entry' }).closest('form'));
    await waitFor(() => expect(cache.simCacheGet).toHaveBeenLastCalledWith('custom/key'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply policy' }).closest('fieldset').disabled).toBe(false));
    fireEvent.change(screen.getByLabelText('New eviction policy'), { target: { value: 'FIFO' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Apply policy' }).closest('form'));
    await waitFor(() => expect(screen.getByText('Memory rack · FIFO')).toBeTruthy());
    expect(screen.queryByText('HEAD · Most recently used')).toBeNull();
    fireEvent.change(screen.getByLabelText('New capacity'), { target: { value: '2' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Apply capacity' }).closest('form'));
    await waitFor(() => expect(screen.getByText('2 / 2')).toBeTruthy());
    expect(cache.simSetCapacity).toHaveBeenLastCalledWith(2);
    expect(screen.getByRole('progressbar').value).toBe(10);
  });

  it('supports removal, sample loading, and clearing without resetting server counters', async () => {
    render(<LruCacheSimulation />);
    await advance(10);
    fireEvent.click(screen.getByRole('button', { name: 'Remove new_order_808' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Remove new_order_808' })).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Load sample entries' }));
    await waitFor(() => expect(screen.getByText('sample-key')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Clear sandbox entries' }));
    await waitFor(() => expect(screen.getByText(/No cached entries/)).toBeTruthy());
    expect(screen.getByText('5 / 3')).toBeTruthy();
    expect(screen.getByRole('progressbar').value).toBe(10);
  });

  it('stops on initialization failures and retries only through a full sandbox reset', async () => {
    cache.simSetCapacity.mockRejectedValueOnce(new Error('Capacity response lost'));
    render(<LruCacheSimulation />);
    fireEvent.click(screen.getByRole('button', { name: 'Start simulation' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Capacity response lost'));
    expect(screen.getByRole('progressbar').value).toBe(0);
    expect(cache.simSetPolicy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.getByRole('progressbar').value).toBe(1));
    expect(cache.simCacheClear).toHaveBeenCalledTimes(2);
    expect(cache.simSetPolicy).toHaveBeenCalledWith('LRU');
  });

  it('serializes manual mutations and preserves the last rack after a failed response', async () => {
    render(<LruCacheSimulation />);
    await advance(10);
    let rejectPut;
    cache.simCachePut.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectPut = reject; }));
    fireEvent.change(screen.getByLabelText('Put key'), { target: { value: 'new-key' } });
    const form = screen.getByRole('button', { name: 'Put entry' }).closest('form');
    fireEvent.submit(form); fireEvent.submit(form);
    expect(cache.simCachePut).toHaveBeenCalledTimes(7);
    rejectPut(new Error('Write response lost'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Write response lost'));
    expect(screen.getByText('new_order_808')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Sandbox experiments' }).disabled).toBe(true);
    fireEvent.submit(form);
    expect(cache.simCachePut).toHaveBeenCalledTimes(7);
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.getByRole('progressbar').value).toBe(1));
    expect(screen.getByText(/No cached entries/)).toBeTruthy();
    expect(cache.simSetCapacity).toHaveBeenLastCalledWith(5);
  });
});
