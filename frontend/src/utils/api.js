const BASE_URL = '/api';

// Resolved at build/dev-server time from the BACKEND_PORT env var (see
// vite.config.js), falling back to the repo default. Used only for the
// human-readable "backend not reachable on port N" banners — the actual
// requests always go through the same-origin /api proxy above.
export const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || '59190';

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

// The deployed backend sits on a free tier that spins down after inactivity and takes
// roughly 50s to wake. Two thresholds rather than one, because they answer different
// questions:
//
//   SLOW_MS    — "is something wrong?" Past this, tell the user the server is waking
//                up instead of leaving them under an indefinite spinner.
//   TIMEOUT_MS — "is it ever coming back?" Generous enough that a genuine cold start
//                still succeeds, short enough that a dead backend doesn't hang forever.
//
// Before this, fetch ran with no timeout at all: a cold instance left every request
// pending until the browser gave up, and pollers stacked more on top of them.
const SLOW_MS = 4000;
const TIMEOUT_MS = 60000;

export const BACKEND_STATUS = { OK: 'ok', WAKING: 'waking', DOWN: 'down' };

let backendStatus = BACKEND_STATUS.OK;
const statusListeners = new Set();
let inFlight = 0;

function setBackendStatus(next) {
  if (backendStatus === next) return;
  backendStatus = next;
  for (const listener of statusListeners) listener(next);
}

export function getBackendStatus() {
  return backendStatus;
}

/** Subscribe to backend reachability changes. Returns an unsubscribe function. */
export function subscribeBackendStatus(listener) {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

/**
 * Abort controller that fires when either the caller's signal aborts or the timeout
 * elapses. `AbortSignal.any` would do this in one line but is too new to rely on for
 * every browser this is deployed to.
 */
function withTimeout(callerSignal) {
  const controller = new AbortController();
  // Whether the timeout fired is tracked here rather than read back off the rejected
  // error: what fetch rejects with on abort varies by runtime, so branching on the
  // error's shape silently mislabels a timeout as a generic network failure.
  const state = { timedOut: false };
  const timeoutId = setTimeout(() => {
    state.timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);

  const onCallerAbort = () => controller.abort(callerSignal.reason);
  if (callerSignal) {
    if (callerSignal.aborted) onCallerAbort();
    else callerSignal.addEventListener('abort', onCallerAbort, { once: true });
  }

  return {
    signal: controller.signal,
    state,
    cleanup() {
      clearTimeout(timeoutId);
      callerSignal?.removeEventListener('abort', onCallerAbort);
    },
  };
}

export async function apiFetch(path, options = {}) {
  const url = path.startsWith('/api') ? path : `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const { signal, state, cleanup } = withTimeout(options.signal);

  inFlight += 1;
  const slowTimer = setTimeout(() => setBackendStatus(BACKEND_STATUS.WAKING), SLOW_MS);

  const settle = () => {
    clearTimeout(slowTimer);
    cleanup();
    inFlight = Math.max(0, inFlight - 1);
  };

  let res;
  try {
    res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
      signal,
    });
  } catch (err) {
    settle();
    // A caller-initiated abort (unmount, deps change) says nothing about the backend —
    // only a timeout or a transport failure does.
    if (options.signal?.aborted) throw err;
    if (inFlight === 0) setBackendStatus(BACKEND_STATUS.DOWN);
    throw new ApiError(
      0,
      state.timedOut
        ? 'The server did not respond in time. It may be waking up from idle — try again in a moment.'
        : 'Could not reach the server. Check your connection and try again.',
      null,
    );
  }

  settle();
  setBackendStatus(BACKEND_STATUS.OK);

  if (!res.ok) {
    let body;
    try {
      body = await res.json();
    } catch {
      try {
        body = await res.text();
      } catch {
        body = null;
      }
    }
    // `message` is checked first: for a DomainException, GlobalExceptionHandler's ErrorResponse
    // only ever has `error` (the real, specific reason) and no `message` field at all, so this
    // falls through to `error` exactly as before. But for an exception nothing catches, Spring's
    // default /error handler always fills `error` with the generic HTTP reason phrase ("Internal
    // Server Error") and puts the actual exception detail in `message` — preferring `error` there
    // silently threw away the one field that said what actually broke (RCA-049).
    const message = (typeof body === 'object' && body !== null && (body.message || body.error))
      ? (body.message || body.error)
      : (typeof body === 'string' && body.length > 0 ? body : `HTTP ${res.status} ${res.statusText}`);
    
    throw new ApiError(res.status, message, body);
  }

  // Handle empty or 204 No Content responses
  const contentType = res.headers.get('content-type');
  if (res.status === 204 || (contentType && !contentType.includes('application/json'))) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  return res.json();
}
