// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoggingFrameworkPage from '../lld/logging-framework/LoggingFrameworkPage';
import * as api from '../lld/logging-framework/api';

vi.mock('../lld/logging-framework/api');

let stored;
let threshold;
let emitted;

function openSimulation() {
  sessionStorage.setItem('lld-tab-logging-framework', 'simulation');
  return render(<MemoryRouter><LoggingFrameworkPage /></MemoryRouter>);
}

async function advance(completed) {
  fireEvent.click(screen.getByRole('button', { name: completed === 1 ? 'Start simulation' : 'Next step' }));
  await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('value', String(completed)));
}

beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  stored = [];
  threshold = 'DEBUG';
  emitted = { id: 91, level: 'INFO', loggerName: 'PaymentGateway', message: 'Server event', formattedMessage: 'JAVA: Server event' };
  const telemetry = () => ({ globalLevel: threshold, formatter: 'SIMPLE', totalLogs: stored.length, asyncEnabled: false, queueCapacity: 37, currentQueueDepth: 0, droppedLogs: 0 });
  api.simReset.mockImplementation(async () => { stored = []; threshold = 'DEBUG'; });
  api.simConfigure.mockImplementation(async (next) => { threshold = next; return telemetry(); });
  api.simEmitLog.mockImplementation(async () => {
    if (emitted) stored.push(emitted);
    return emitted;
  });
  api.simGetTelemetry.mockImplementation(async () => telemetry());
  api.simGetLogs.mockImplementation(async () => [...stored]);
  api.simGetAppenderLogs.mockImplementation(async (sink) => stored.map(event => `${sink}: ${event.message}`));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Logging sandbox walkthrough', () => {
  it('waits for explicit start and blocks an empty message without sending requests', () => {
    openSimulation();
    expect(api.simReset).not.toHaveBeenCalled();
    expect(api.simGetTelemetry).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Simulation message'), { target: { value: ' ' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a message');
    expect(screen.getByRole('button', { name: 'Start simulation' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
    expect(api.simReset).not.toHaveBeenCalled();
  });

  it('uses backend outcomes and metrics, sends the threshold, and reads all four sinks', async () => {
    openSimulation();
    fireEvent.change(screen.getByLabelText('Logger category'), { target: { value: 'PaymentGateway' } });
    fireEvent.change(screen.getByLabelText('Filter threshold'), { target: { value: 'ERROR' } });
    fireEvent.change(screen.getByLabelText('Simulation message'), { target: { value: ' Custom event ' } });
    await advance(1);
    expect(screen.getByText('0 / 37')).toBeInTheDocument();
    await advance(2);
    expect(api.simConfigure).toHaveBeenCalledWith('ERROR', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(screen.getByLabelText('Filter threshold')).toBeDisabled();
    await advance(3);
    expect(screen.getByText('Accepted by the Java logger.')).toBeInTheDocument();
    expect(api.simEmitLog).toHaveBeenCalledWith('PaymentGateway', 'INFO', 'Custom event', { traceId: 'sim-trc-901', userId: 'usr-442' }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    for (let completed = 4; completed <= 8; completed++) await advance(completed);
    expect(api.simGetAppenderLogs.mock.calls.map(([sink]) => sink)).toEqual(['CONSOLE', 'FILE', 'DATABASE', 'ELASTICSEARCH']);
    expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'ELASTICSEARCH', exact: true }));
    expect(within(screen.getByRole('region', { name: 'ELASTICSEARCH snapshot' })).getByText('ELASTICSEARCH: Server event')).toBeInTheDocument();
    expect(api.getConfig).not.toHaveBeenCalled();
    expect(api.configure).not.toHaveBeenCalled();
    expect(api.sendLog).not.toHaveBeenCalled();
  });

  it('reports filtering from an empty backend response rather than comparing local levels', async () => {
    emitted = null;
    openSimulation();
    fireEvent.change(screen.getByLabelText('Emitted log level'), { target: { value: 'FATAL' } });
    fireEvent.change(screen.getByLabelText('Filter threshold'), { target: { value: 'TRACE' } });
    for (let completed = 1; completed <= 8; completed++) await advance(completed);
    expect(screen.getByText('Filtered by the Java logger.')).toBeInTheDocument();
    expect(screen.getByText('No events were stored in this snapshot.')).toBeInTheDocument();
    expect(screen.getByText('No records were returned by this appender.')).toBeInTheDocument();
  });

  it('stops after a configuration failure and recovers only through an explicit reset', async () => {
    api.simConfigure.mockRejectedValueOnce(new Error('Threshold unavailable'));
    openSimulation();
    fireEvent.change(screen.getByLabelText('Simulation message'), { target: { value: 'Keep this draft' } });
    await advance(1);
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Threshold unavailable');
    expect(api.simEmitLog).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByLabelText('Simulation message')).toHaveValue('Keep this draft');
    expect(screen.getByLabelText('Filter threshold')).not.toBeDisabled();
    await advance(2);
    await advance(3);
    expect(screen.getByText('Accepted by the Java logger.')).toBeInTheDocument();
    expect(api.simReset).toHaveBeenCalledTimes(2);
  });

  it('guards duplicate starts and aborts an unfinished sandbox request on navigation', async () => {
    api.simReset.mockImplementationOnce(({ signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const view = openSimulation();
    const start = screen.getByRole('button', { name: 'Start simulation' });
    fireEvent.click(start);
    fireEvent.click(start);
    expect(api.simReset).toHaveBeenCalledTimes(1);
    expect(start).toBeDisabled();
    const signal = api.simReset.mock.calls[0][0].signal;
    await act(async () => view.unmount());
    expect(signal.aborted).toBe(true);
    expect(api.simGetTelemetry).not.toHaveBeenCalled();
  });

  it('pauses upcoming operations and removes playback timers on unmount', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const view = openSimulation();
    fireEvent.click(screen.getByRole('button', { name: 'Play', exact: true }));
    await act(async () => vi.advanceTimersByTimeAsync(1700));
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1');
    fireEvent.click(screen.getByRole('button', { name: 'Pause', exact: true }));
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(api.simConfigure).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Play', exact: true }));
    view.unmount();
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(api.simConfigure).not.toHaveBeenCalled();
  });

  it('bounds large repository and sink snapshots without changing their returned counts', async () => {
    api.simGetLogs.mockResolvedValue(Array.from({ length: 101 }, (_value, index) => ({ id: index, message: `Stored ${index}` })));
    api.simGetAppenderLogs.mockResolvedValue(Array.from({ length: 101 }, (_value, index) => `Sink ${index}`));
    openSimulation();
    for (let completed = 1; completed <= 5; completed++) await advance(completed);
    expect(screen.queryByText('Stored 0', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText('Sink 0', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText('Stored 100', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('Sink 100', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('101 events returned. Showing the latest 50 at most.')).toBeInTheDocument();
    expect(screen.getByText('101 records returned. Showing the latest 50 at most.')).toBeInTheDocument();
  });
});
