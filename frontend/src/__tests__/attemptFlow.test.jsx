// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';

import DesignDetails from '../components/DesignDetails';
import { useAttempt } from '../hooks/useAttempt';
import { useReveal } from '../hooks/useReveal';
import { buildProgressExport, importProgress } from '../utils/progressData';

beforeEach(() => {
  localStorage.clear();
});

describe('useAttempt', () => {
  it('stores and returns an attempt per module', () => {
    const { result } = renderHook(() => useAttempt());

    expect(result.current.hasAttempt('splitwise')).toBe(false);
    act(() => result.current.setAttempt('splitwise', 'User, Group, Expense, Split'));

    expect(result.current.getAttempt('splitwise')).toBe('User, Group, Expense, Split');
    expect(result.current.hasAttempt('splitwise')).toBe(true);
    // Strictly per module — one note must never bleed into another.
    expect(result.current.getAttempt('uber')).toBe('');
  });

  it('treats whitespace-only text as no attempt and drops it', () => {
    const { result } = renderHook(() => useAttempt());
    act(() => result.current.setAttempt('atm', 'Card, Account'));
    act(() => result.current.setAttempt('atm', '   '));

    expect(result.current.hasAttempt('atm')).toBe(false);
  });

  it('persists across a remount', () => {
    const first = renderHook(() => useAttempt());
    act(() => first.result.current.setAttempt('chess', 'Board, Piece, Move'));

    expect(renderHook(() => useAttempt()).result.current.getAttempt('chess')).toBe('Board, Piece, Move');
  });

  it('survives corrupt stored data', () => {
    localStorage.setItem('lld-attempt-v1', '["not","an","object"]');
    const { result } = renderHook(() => useAttempt());
    expect(result.current.getAttempt('anything')).toBe('');
  });

  it('rides along in the progress export, so notes move browsers too', () => {
    const { result } = renderHook(() => useAttempt());
    act(() => result.current.setAttempt('locker', 'Locker, Parcel, SizeStrategy'));

    const exported = buildProgressExport();
    localStorage.clear();
    importProgress(exported);

    expect(renderHook(() => useAttempt()).result.current.getAttempt('locker'))
      .toBe('Locker, Parcel, SizeStrategy');
  });
});

describe('attempt → reveal → compare', () => {
  it('offers the box while gated, then shows the note beside the solution', async () => {
    render(<DesignDetails module="splitwise" />);

    // Requirements is ungated; the gated sub-tabs are where the attempt box lives.
    await waitFor(() => expect(screen.getByText(/🧩 Design Patterns/)).toBeDefined());
    fireEvent.click(screen.getByText(/🧩 Design Patterns/));

    const box = await screen.findByLabelText(/your design/i);
    fireEvent.change(box, { target: { value: 'Expense, Split, SplitStrategy' } });

    fireEvent.click(screen.getByText(/Reveal Solution/i));

    // After revealing, the attempt is still on screen — that comparison is the point.
    await waitFor(() => {
      expect(screen.getByText(/What you said before revealing/i)).toBeDefined();
    });
    // Rendered in the comparison panel (and again in the collapsed "edit your notes"
    // box), so assert presence rather than uniqueness.
    expect(screen.getAllByText(/Expense, Split, SplitStrategy/).length).toBeGreaterThan(0);
  });

  it('shows no comparison panel when nothing was written', async () => {
    const { result } = renderHook(() => useReveal());
    act(() => result.current.reveal('uber'));

    render(<DesignDetails module="uber" />);
    await waitFor(() => expect(screen.getByText(/🧩 Design Patterns/)).toBeDefined());
    fireEvent.click(screen.getByText(/🧩 Design Patterns/));

    await waitFor(() => {
      expect(screen.queryByText(/What you said before revealing/i)).toBeNull();
    });
  });
});
