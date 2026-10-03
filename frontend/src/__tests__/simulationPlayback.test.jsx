// @vitest-environment happy-dom
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSimulationPlayback } from '../hooks/useSimulationPlayback';
import SimulationControls from '../components/SimulationControls';

afterEach(() => vi.useRealTimers());

describe('Simulation playback', () => {
  it('starts at zero, serializes requests and includes the final step', async () => {
    let finish;
    const execute = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue('final');
    const { result } = renderHook(() => useSimulationPlayback(2, execute));
    act(() => { void result.current.next(); void result.current.next(); void result.current.reset(); });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(0, null);
    expect(result.current.completed).toBe(0);
    await act(async () => { finish('first'); });
    expect(result.current.completed).toBe(1);
    await act(async () => { await result.current.next(); });
    expect(execute).toHaveBeenLastCalledWith(1, 'first');
    expect(result.current.done).toBe(true);
    expect(result.current.result).toBe('final');
    await act(async () => { await result.current.next(); });
    expect(execute).toHaveBeenCalledTimes(2);
    await act(async () => { await result.current.reset(); });
    expect(execute).toHaveBeenLastCalledWith(0, null);
    expect(result.current.completed).toBe(1);
    expect(result.current.done).toBe(false);
  });

  it('pauses upcoming steps without cancelling an in-flight response', async () => {
    vi.useFakeTimers();
    let finish;
    const execute = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    const { result } = renderHook(() => useSimulationPlayback(3, execute));
    act(() => result.current.play());
    await act(async () => { await vi.advanceTimersByTimeAsync(1600); });
    expect(result.current.busy).toBe(true);
    act(() => result.current.pause());
    await act(async () => { finish('snapshot'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(result.current.completed).toBe(1);
    expect(result.current.result).toBe('snapshot');
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('supports pacing changes and stops automatically after completion', async () => {
    vi.useFakeTimers();
    const execute = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useSimulationPlayback(2, execute));
    act(() => { result.current.setSpeed(2); result.current.play(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(799); });
    expect(execute).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(result.current.completed).toBe(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(result.current.completed).toBe(2);
    expect(result.current.playing).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('does not skip or retry failed mutations; requires a successful reset', async () => {
    const execute = vi.fn().mockResolvedValueOnce('initial').mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValue('reset');
    const { result } = renderHook(() => useSimulationPlayback(3, execute));
    await act(async () => { await result.current.next(); });
    await act(async () => { await result.current.next(); });
    expect(result.current.completed).toBe(1);
    expect(result.current.error).toBe('Connection lost');
    expect(result.current.result).toBe('initial');
    await act(async () => { result.current.play(); await result.current.next(); });
    expect(execute).toHaveBeenCalledTimes(2);
    await act(async () => { await result.current.reset(); });
    expect(result.current.error).toBe('');
    expect(execute).toHaveBeenLastCalledWith(0, null);
  });

  it('stops timers and ignores late responses when the simulation unmounts', async () => {
    vi.useFakeTimers();
    let finish;
    const execute = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    const { result, unmount } = renderHook(() => useSimulationPlayback(3, execute));
    act(() => result.current.play());
    await act(async () => { await vi.advanceTimersByTimeAsync(1600); });
    unmount();
    await act(async () => { finish('late'); await vi.advanceTimersByTimeAsync(10000); });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(result.current.result).toBe(null);
  });

  it('presents accessible controls, descriptions, and safe error recovery', async () => {
    const steps = [{ title: 'Reset', detail: 'Create a sandbox.' }, { title: 'Request', detail: 'Send one request.' }];
    function Demo() {
      const playback = useSimulationPlayback(steps.length, async () => { throw new Error('Offline'); });
      return <SimulationControls steps={steps} playback={playback} />;
    }
    render(<Demo />);
    expect(screen.getByRole('progressbar', { name: 'Simulation progress' }).getAttribute('value')).toBe('0');
    expect(screen.getByText('Create a sandbox.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Start simulation' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Offline'));
    expect(screen.getByRole('button', { name: 'Play' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Reset sandbox' }).disabled).toBe(false);
    expect(screen.getByLabelText('Playback speed')).toBeDefined();
  });
});
