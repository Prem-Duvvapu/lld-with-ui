import { useCallback, useState } from 'react';

const STORAGE_KEY = 'lld-progress-v1';

function loadReviewed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReviewed(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // localStorage unavailable (private browsing, quota, blocked) -- progress just won't persist
  }
}

/**
 * Per-visitor "reviewed" checklist across LLD modules, persisted in this browser's
 * localStorage only -- there's no auth/backend state in this app, so progress is local to
 * whoever's browser is viewing the site and does not sync across devices.
 */
export function useProgress() {
  const [reviewed, setReviewed] = useState(loadReviewed);

  const toggle = useCallback((path) => {
    setReviewed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      saveReviewed(next);
      return next;
    });
  }, []);

  const isReviewed = useCallback((path) => reviewed.has(path), [reviewed]);

  return { reviewed, toggle, isReviewed, count: reviewed.size };
}
