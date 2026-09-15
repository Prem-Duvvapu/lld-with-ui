// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useProgress } from '../hooks/useProgress';
import { useReveal } from '../hooks/useReveal';
import { useRevisit } from '../hooks/useRevisit';
import { useTour } from '../hooks/useTour';
import { buildProgressExport, importProgress } from '../utils/progressData';

/**
 * Everything a visitor accumulates on this site — what they've reviewed, what they've
 * revealed, what they've flagged — lives in localStorage and nowhere else. There is no
 * backend copy to fall back on, so a bug in these five modules silently destroys the
 * only record of someone's progress.
 *
 * None of them had a single test before this file, including useProgress's migration,
 * which rewrites every existing user's stored format the first time they load the page
 * after deploy.
 */
beforeEach(() => {
  localStorage.clear();
});

describe('useProgress', () => {
  it('records a reviewed module with the time it was marked', () => {
    const { result } = renderHook(() => useProgress());
    expect(result.current.isReviewed('splitwise')).toBe(false);

    act(() => result.current.toggle('splitwise'));

    expect(result.current.isReviewed('splitwise')).toBe(true);
    expect(result.current.count).toBe(1);
    expect(result.current.reviewedAt('splitwise')).toBeGreaterThan(0);
  });

  it('toggles back off and forgets the timestamp', () => {
    const { result } = renderHook(() => useProgress());
    act(() => result.current.toggle('uber'));
    act(() => result.current.toggle('uber'));

    expect(result.current.isReviewed('uber')).toBe(false);
    expect(result.current.count).toBe(0);
    expect(result.current.reviewedAt('uber')).toBeNull();
  });

  it('persists across a remount, which is the whole point of the hook', () => {
    const first = renderHook(() => useProgress());
    act(() => first.result.current.toggle('elevator'));

    const second = renderHook(() => useProgress());
    expect(second.result.current.isReviewed('elevator')).toBe(true);
  });

  // The stored shape changed from ["a","b"] to {"a": <ts>, "b": <ts>}. Anyone who used
  // the site before that deploy has the old shape in their browser; losing it would wipe
  // their progress with no way to recover it.
  it('migrates the legacy array format without losing progress', () => {
    localStorage.setItem('lld-progress-v1', JSON.stringify(['splitwise', 'uber', 'chess']));

    const { result } = renderHook(() => useProgress());

    expect(result.current.count).toBe(3);
    expect(result.current.isReviewed('splitwise')).toBe(true);
    expect(result.current.isReviewed('chess')).toBe(true);
    // No real timestamp exists for migrated entries, but there must be one so the
    // "last reviewed" UI has something to show.
    expect(result.current.reviewedAt('uber')).toBeGreaterThan(0);
  });

  it('survives corrupt stored data rather than crashing the page', () => {
    localStorage.setItem('lld-progress-v1', '{not json');
    const { result } = renderHook(() => useProgress());
    expect(result.current.count).toBe(0);
  });
});

describe('useReveal', () => {
  it('reveals and hides a single module independently', () => {
    const { result } = renderHook(() => useReveal());

    expect(result.current.isRevealed('atm')).toBe(false);
    act(() => result.current.reveal('atm'));
    expect(result.current.isRevealed('atm')).toBe(true);
    expect(result.current.isRevealed('chess')).toBe(false);

    act(() => result.current.hide('atm'));
    expect(result.current.isRevealed('atm')).toBe(false);
  });

  it('keeps a reveal across a remount', () => {
    const first = renderHook(() => useReveal());
    act(() => first.result.current.reveal('kvstore'));

    const second = renderHook(() => useReveal());
    expect(second.result.current.isRevealed('kvstore')).toBe(true);
  });
});

describe('useRevisit', () => {
  it('flags and unflags a module, separately from reviewed state', () => {
    const { result } = renderHook(() => useRevisit());

    act(() => result.current.toggleRevisit('locker'));
    expect(result.current.isRevisit('locker')).toBe(true);
    expect(result.current.count).toBe(1);

    act(() => result.current.toggleRevisit('locker'));
    expect(result.current.isRevisit('locker')).toBe(false);
  });
});

describe('useTour', () => {
  it('shows once, then remembers that it has been seen', () => {
    const first = renderHook(() => useTour());
    expect(first.result.current.hasSeenTour).toBe(false);

    act(() => first.result.current.markSeen());
    expect(first.result.current.hasSeenTour).toBe(true);

    const second = renderHook(() => useTour());
    expect(second.result.current.hasSeenTour).toBe(true);
  });
});

describe('progress export / import', () => {
  it('round-trips every kind of progress through a single file', () => {
    const progress = renderHook(() => useProgress());
    const reveal = renderHook(() => useReveal());
    const revisit = renderHook(() => useRevisit());

    act(() => progress.result.current.toggle('splitwise'));
    act(() => reveal.result.current.reveal('uber'));
    act(() => revisit.result.current.toggleRevisit('chess'));

    const exported = buildProgressExport();
    expect(exported.app).toBe('lld-with-ui');
    expect(Object.keys(exported.data)).toEqual(
      expect.arrayContaining(['lld-progress-v1', 'lld-revealed-v1', 'lld-revisit-v1']),
    );

    // Simulate the other browser this file exists to move progress to.
    localStorage.clear();
    importProgress(exported);

    expect(renderHook(() => useProgress()).result.current.isReviewed('splitwise')).toBe(true);
    expect(renderHook(() => useReveal()).result.current.isRevealed('uber')).toBe(true);
    expect(renderHook(() => useRevisit()).result.current.isRevisit('chess')).toBe(true);
  });

  it('refuses a file that is not a progress export instead of wiping what is there', () => {
    const progress = renderHook(() => useProgress());
    act(() => progress.result.current.toggle('splitwise'));

    expect(() => importProgress({ some: 'other file' })).toThrow(/not look like a progress export/i);
    expect(() => importProgress(null)).toThrow();

    // The existing progress must still be intact after a rejected import.
    expect(renderHook(() => useProgress()).result.current.isReviewed('splitwise')).toBe(true);
  });

  it('rejects an export whose payload has no recognized keys', () => {
    expect(() => importProgress({ app: 'lld-with-ui', version: 1, data: { unrelated: [] } }))
      .toThrow(/no recognized progress data/i);
  });

  it('does not throw when localStorage is unavailable', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: storage disabled');
    });

    // Private browsing and blocked site data must degrade to "no progress", not a
    // white screen.
    expect(() => renderHook(() => useProgress())).not.toThrow();
    expect(() => buildProgressExport()).not.toThrow();

    getItem.mockRestore();
  });
});
