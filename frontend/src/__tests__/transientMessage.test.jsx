// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTransientMessage } from '../hooks/useTransientMessage';

afterEach(() => vi.useRealTimers());

describe('useTransientMessage', () => {
  it('never lets an older timer clear a newer message early', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTransientMessage());
    act(() => result.current[1]({ text: 'first', type: 'success' }));
    act(() => vi.advanceTimersByTime(3000));
    act(() => result.current[1]({ text: 'second', type: 'success' }));
    act(() => vi.advanceTimersByTime(1500));
    expect(result.current[0]).toEqual({ text: 'second', type: 'success' });
    act(() => vi.advanceTimersByTime(2500));
    expect(result.current[0]).toBeNull();
  });

  it('keeps errors visible until they are replaced or cleared', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTransientMessage());
    act(() => result.current[1]({ text: 'Seat already held', type: 'error' }));
    act(() => vi.advanceTimersByTime(60000));
    expect(result.current[0]).toEqual({ text: 'Seat already held', type: 'error' });
    act(() => result.current[1]({ text: 'Booked', kind: 'success' }));
    expect(result.current[0].text).toBe('Booked');
    act(() => result.current[1]({ text: 'Rejected', kind: 'error' }));
    act(() => vi.advanceTimersByTime(60000));
    expect(result.current[0].text).toBe('Rejected');
    act(() => result.current[2]());
    expect(result.current[0]).toBeNull();
  });

  it('restores the caller-supplied empty value and cancels its timer on unmount', () => {
    vi.useFakeTimers();
    const empty = { text: '', type: 'info' };
    const { result, unmount } = renderHook(() => useTransientMessage(empty, 2500));
    act(() => result.current[1]({ text: 'Saved', type: 'info' }));
    act(() => vi.advanceTimersByTime(2500));
    expect(result.current[0]).toBe(empty);
    act(() => result.current[1]({ text: 'Saved again', type: 'info' }));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('holds a value with a per-call duration of 0 until the next call schedules the clear', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTransientMessage(false, 2000));
    act(() => result.current[1](true, 0));
    act(() => vi.advanceTimersByTime(10000));
    expect(result.current[0]).toBe(true);
    act(() => result.current[1](true));
    act(() => vi.advanceTimersByTime(1999));
    expect(result.current[0]).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current[0]).toBe(false);
  });
});
