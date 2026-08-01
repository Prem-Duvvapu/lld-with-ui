const BASE_URL = '/api';

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
    const message = (typeof body === 'object' && body !== null && (body.error || body.message))
      ? (body.error || body.message)
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
