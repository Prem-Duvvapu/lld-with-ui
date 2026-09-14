// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

import { apiFetch, ApiError, BACKEND_STATUS, getBackendStatus, subscribeBackendStatus } from '../utils/api';
import { usePolling } from '../hooks/usePolling';

function jsonResponse(body = {}) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => body,
  };
}

/** Let queued microtasks run without advancing the fake clock. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('apiFetch resilience', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('reports the backend as waking while a slow request is in flight, then ok', async () => {
    let resolveFetch;
    vi.stubGlobal('fetch', vi.fn(() => new Promise((res) => { resolveFetch = res; })));

    const seen = [];
    const unsubscribe = subscribeBackendStatus((s) => seen.push(s));

    const pending = apiFetch('/slow');

    // Nothing announced yet — a request that returns quickly should never flash a banner.
    await vi.advanceTimersByTimeAsync(3000);
    expect(seen).toEqual([]);

    // Past the slow threshold the user is told the server is waking up, rather than
    // being left under an indefinite spinner.
    await vi.advanceTimersByTimeAsync(2000);
    expect(seen).toContain(BACKEND_STATUS.WAKING);

    resolveFetch(jsonResponse({ ok: true }));
    await pending;

    expect(getBackendStatus()).toBe(BACKEND_STATUS.OK);
    unsubscribe();
  });

  it('times out rather than hanging forever, with a message that explains why', async () => {
    // A fetch that never settles unless aborted — a sleeping backend.
    vi.stubGlobal('fetch', vi.fn((_url, { signal }) => new Promise((_res, rej) => {
      signal.addEventListener('abort', () => {
        const err = new Error('aborted');
        err.name = 'AbortError';
        rej(err);
      });
    })));

    const pending = apiFetch('/never').catch((e) => e);
    await vi.advanceTimersByTimeAsync(61000);

    const err = await pending;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
    expect(err.message).toMatch(/waking up|did not respond/i);
  });

  it('treats a caller-initiated abort as unmount, not as the backend being down', async () => {
    vi.stubGlobal('fetch', vi.fn((_url, { signal }) => new Promise((_res, rej) => {
      signal.addEventListener('abort', () => {
        const err = new Error('aborted');
        err.name = 'AbortError';
        rej(err);
      });
    })));

    // Backend status is module-global and deliberately sticky until the next request
    // settles, so assert this abort *leaves it alone* rather than asserting an absolute
    // value a previous test may have set.
    const before = getBackendStatus();
    const controller = new AbortController();
    const pending = apiFetch('/cancelled', { signal: controller.signal }).catch((e) => e);
    controller.abort();

    const err = await pending;
    expect(err.name).toBe('AbortError');
    expect(getBackendStatus()).toBe(before);
  });
});

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('never runs two polls at once, however slow the backend is', async () => {
    let inFlight = 0;
    let maxConcurrent = 0;
    let calls = 0;
    let release;

    function Poller() {
      usePolling(() => {
        calls += 1;
        inFlight += 1;
        maxConcurrent = Math.max(maxConcurrent, inFlight);
        return new Promise((res) => {
          release = () => { inFlight -= 1; res(); };
        });
      }, 1000, []);
      return null;
    }

    render(<Poller />);
    await flush();
    expect(calls).toBe(1);

    // Five intervals elapse while the first request is still outstanding. The old
    // setInterval version fired every one of them and stacked the requests up.
    await vi.advanceTimersByTimeAsync(5000);
    expect(calls).toBe(1);
    expect(maxConcurrent).toBe(1);

    release();
    await vi.advanceTimersByTimeAsync(1100);
    await waitFor(() => expect(calls).toBe(2));
    expect(maxConcurrent).toBe(1);
  });

  it('backs off after consecutive failures instead of hammering a dead backend', async () => {
    const times = [];
    function Poller() {
      usePolling(async () => {
        times.push(Date.now());
        throw new Error('backend down');
      }, 1000, []);
      return null;
    }

    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Poller />);
    await flush();
    expect(times).toHaveLength(1);

    // First retry waits 2x the base interval, not 1x.
    await vi.advanceTimersByTimeAsync(1500);
    expect(times).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(700);
    await waitFor(() => expect(times).toHaveLength(2));

    // Second retry waits 4x — the gap keeps widening rather than staying flat.
    await vi.advanceTimersByTimeAsync(3000);
    expect(times).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1200);
    await waitFor(() => expect(times).toHaveLength(3));
  });
});
