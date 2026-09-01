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

export async function apiFetch(path, options = {}) {
  const url = path.startsWith('/api') ? path : `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

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
