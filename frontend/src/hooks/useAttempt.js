import { useCallback, useState } from 'react';

const STORAGE_KEY = 'lld-attempt-v1';

function loadAttempts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveAttempts(attempts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
  } catch {
    // localStorage unavailable — the note just won't survive a reload.
  }
}

/**
 * What the visitor thought the design should be, before they revealed the real one.
 *
 * The reveal gate makes someone pause; it doesn't make them *produce* anything, and
 * writing your own class list before looking is where the learning actually happens.
 * Keyed by module and kept per-browser like every other kind of progress here — there
 * is no backend to sync it to.
 */
export function useAttempt() {
  const [attempts, setAttempts] = useState(loadAttempts);

  const setAttempt = useCallback((module, text) => {
    setAttempts((prev) => {
      const next = { ...prev };
      if (text && text.trim()) {
        next[module] = text;
      } else {
        delete next[module];
      }
      saveAttempts(next);
      return next;
    });
  }, []);

  const getAttempt = useCallback((module) => attempts[module] || '', [attempts]);
  const hasAttempt = useCallback((module) => Boolean(attempts[module]?.trim()), [attempts]);

  return { getAttempt, setAttempt, hasAttempt };
}
