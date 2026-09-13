import { useCallback, useState } from 'react';

const STORAGE_KEY = 'lld-revealed-v1';

function loadRevealed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveRevealed(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // localStorage unavailable (private browsing, quota, blocked) -- reveal state just won't persist
  }
}

/**
 * Per-visitor "solution revealed" flag, one per module, persisted in this browser's
 * localStorage only (same fit as useProgress -- no auth/backend state in this app). Shared
 * across DesignDetails' non-Requirements sub-tabs and the Class/Sequence Diagram tabs for a
 * given module: revealing any one of them unlocks all three, since once you've looked at part
 * of a module's solution there's no point re-hiding the rest of it.
 */
export function useReveal() {
  const [revealed, setRevealed] = useState(loadRevealed);

  const reveal = useCallback((module) => {
    setRevealed((prev) => {
      if (prev.has(module)) return prev;
      const next = new Set(prev);
      next.add(module);
      saveRevealed(next);
      return next;
    });
  }, []);

  const hide = useCallback((module) => {
    setRevealed((prev) => {
      if (!prev.has(module)) return prev;
      const next = new Set(prev);
      next.delete(module);
      saveRevealed(next);
      return next;
    });
  }, []);

  const isRevealed = useCallback((module) => revealed.has(module), [revealed]);

  return { isRevealed, reveal, hide };
}
