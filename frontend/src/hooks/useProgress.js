import { useCallback, useMemo, useState } from 'react';

const STORAGE_KEY = 'lld-progress-v1';

function loadReviewedMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // pre-timestamp format: a bare array of reviewed paths. Migrate in place —
      // there's no way to recover the real reviewed date, so stamp it as "now".
      const now = Date.now();
      return Object.fromEntries(parsed.map((path) => [path, now]));
    }
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveReviewedMap(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
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
  const [reviewedMap, setReviewedMap] = useState(loadReviewedMap);

  const toggle = useCallback((path) => {
    setReviewedMap((prev) => {
      const next = { ...prev };
      if (next[path]) delete next[path];
      else next[path] = Date.now();
      saveReviewedMap(next);
      return next;
    });
  }, []);

  const isReviewed = useCallback((path) => Boolean(reviewedMap[path]), [reviewedMap]);
  const reviewedAt = useCallback((path) => reviewedMap[path] || null, [reviewedMap]);
  const reviewed = useMemo(() => new Set(Object.keys(reviewedMap)), [reviewedMap]);

  return { reviewed, toggle, isReviewed, reviewedAt, count: reviewed.size };
}
