import { useCallback, useState } from 'react';

const STORAGE_KEY = 'lld-revisit-v1';

function loadRevisit() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveRevisit(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // localStorage unavailable -- flag just won't persist
  }
}

/**
 * Per-visitor "flag for revisit" marker, independent of the reviewed checklist --
 * a module can be reviewed AND flagged (came back to it once, want another pass before
 * an interview) or flagged without being reviewed yet (skimmed it, want to come back).
 */
export function useRevisit() {
  const [revisit, setRevisit] = useState(loadRevisit);

  const toggleRevisit = useCallback((path) => {
    setRevisit((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      saveRevisit(next);
      return next;
    });
  }, []);

  const isRevisit = useCallback((path) => revisit.has(path), [revisit]);

  return { revisit, toggleRevisit, isRevisit, count: revisit.size };
}
