// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoggingFrameworkPage from '../lld/logging-framework/LoggingFrameworkPage';
import * as loggingApi from '../lld/logging-framework/api';

vi.mock('../lld/logging-framework/api');

let configuration;

function openWorkspace(tab = 'app') {
  sessionStorage.setItem('lld-tab-logging-framework', tab);
  return render(<MemoryRouter><LoggingFrameworkPage /></MemoryRouter>);
}

async function ready() {
  await waitFor(() => expect(screen.queryByText('Loading logging data…')).not.toBeInTheDocument());
}

beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  configuration = {
    globalLevel: 'INFO', activeFormatter: 'SIMPLE', asyncEnabled: false,
    loggerLevels: {}, appenders: [{ name: 'ConsoleAppender', type: 'CONSOLE', enabled: true, logCount: 0 }]
  };
  loggingApi.getConfig.mockImplementation(async () => structuredClone(configuration));
  loggingApi.getLogs.mockResolvedValue([]);
  loggingApi.getAppenderLogs.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Logging workspace', () => {
  it('shows load failures and recovers with Retry', async () => {
    loggingApi.getConfig.mockRejectedValueOnce(new Error('Logging service unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    openWorkspace('hierarchy');
    expect(await screen.findByRole('alert')).toHaveTextContent('Logging service unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByLabelText('Root logger threshold')).toHaveValue('INFO');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each(['{bad JSON', '[]', 'null', '"context"', '12'])('rejects invalid MDC context %s without sending a log', async (context) => {
    openWorkspace();
    await ready();
    fireEvent.change(screen.getByLabelText('Log Message'), { target: { value: 'Keep my message' } });
    fireEvent.change(screen.getByLabelText('MDC Context Tags (JSON)'), { target: { value: context } });
    fireEvent.click(screen.getByRole('button', { name: /Send Log/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid JSON object');
    expect(screen.getByLabelText('MDC Context Tags (JSON)')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Log Message')).toHaveValue('Keep my message');
    expect(loggingApi.sendLog).not.toHaveBeenCalled();
  });

  it('prevents duplicate writes, preserves failed input, and allows a successful retry', async () => {
    let rejectSend;
    loggingApi.sendLog.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSend = reject; }));
    openWorkspace();
    await ready();
    fireEvent.change(screen.getByLabelText('Log Message'), { target: { value: 'Payment confirmed' } });
    const send = screen.getByRole('button', { name: /Send Log/ });
    fireEvent.click(send);
    fireEvent.submit(send.closest('form'));
    expect(loggingApi.sendLog).toHaveBeenCalledTimes(1);
    expect(send).toBeDisabled();
    await act(async () => rejectSend(new Error('Request timed out')));
    expect(screen.getByRole('alert')).toHaveTextContent('Request timed out');
    expect(screen.getByLabelText('Log Message')).toHaveValue('Payment confirmed');
    expect(send).not.toBeDisabled();
    loggingApi.sendLog.mockResolvedValueOnce({ id: 'log-1' });
    fireEvent.click(send);
    await waitFor(() => expect(screen.getByLabelText('Log Message')).toHaveValue(''));
    expect(screen.getByText(/Log accepted/)).toBeInTheDocument();
    expect(loggingApi.sendLog.mock.calls[1].slice(0, 4)).toEqual([
      'AuthService', 'INFO', 'Payment confirmed', { traceId: 'trc-901', userId: 'usr-12' }
    ]);
  });

  it('distinguishes a filtered log from one accepted by the server', async () => {
    loggingApi.sendLog.mockResolvedValue(null);
    openWorkspace();
    await ready();
    fireEvent.change(screen.getByLabelText('Log Message'), { target: { value: 'Below threshold' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Log/ }));
    expect(await screen.findByText('Log filtered by the active logger threshold.')).toBeInTheDocument();
  });

  it('keeps mutation success separate from a failed refresh', async () => {
    loggingApi.sendLog.mockResolvedValue({ id: 'log-1' });
    openWorkspace();
    await ready();
    loggingApi.getLogs.mockRejectedValue(new Error('Read temporarily unavailable'));
    fireEvent.change(screen.getByLabelText('Log Message'), { target: { value: 'Already written' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Log/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Read temporarily unavailable');
    expect(screen.getByText(/Log accepted/)).toBeInTheDocument();
    expect(loggingApi.sendLog).toHaveBeenCalledTimes(1);
  });

  it('sends the selected root threshold and keeps emitter severity independent', async () => {
    loggingApi.configure.mockImplementation(async (nextLevel) => {
      configuration.globalLevel = nextLevel;
      return structuredClone(configuration);
    });
    openWorkspace('hierarchy');
    const threshold = await screen.findByLabelText('Root logger threshold');
    fireEvent.change(threshold, { target: { value: 'ERROR' } });
    await waitFor(() => expect(threshold).toHaveValue('ERROR'));
    expect(loggingApi.configure).toHaveBeenCalledWith('ERROR', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    fireEvent.click(screen.getByRole('tab', { name: 'App', exact: true }));
    expect(screen.getByLabelText('Severity Level')).toHaveValue('INFO');
  });

  it('updates overrides through the guarded configuration flow', async () => {
    loggingApi.setLoggerLevel.mockImplementation(async (logger, nextLevel) => {
      configuration.loggerLevels[logger] = nextLevel;
      return structuredClone(configuration);
    });
    openWorkspace('hierarchy');
    const threshold = await screen.findByLabelText('AuthService threshold');
    fireEvent.change(threshold, { target: { value: 'WARN' } });
    await waitFor(() => expect(threshold).toHaveValue('WARN'));
    expect(loggingApi.setLoggerLevel).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Configuration updated.')).toBeInTheDocument();
  });

  it('does not falsely select a formatter when its update fails', async () => {
    loggingApi.setFormatter.mockRejectedValue(new Error('Formatter unavailable'));
    openWorkspace('hierarchy');
    const simple = await screen.findByRole('button', { name: 'SIMPLE', exact: true });
    fireEvent.click(screen.getByRole('button', { name: 'JSON', exact: true }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Formatter unavailable');
    expect(simple).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'JSON', exact: true })).toHaveAttribute('aria-pressed', 'false');
  });

  it('requires confirmation before clearing live logs', async () => {
    loggingApi.clearLogs.mockResolvedValue(null);
    openWorkspace();
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Clear', exact: true }));
    expect(loggingApi.clearLogs).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel', exact: true }));
    expect(screen.queryByRole('button', { name: 'Confirm clear' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm clear' }));
    expect(await screen.findByText('Log entries and appender buffers cleared.')).toBeInTheDocument();
    expect(loggingApi.clearLogs).toHaveBeenCalledTimes(1);
  });

  it('aborts pending work and stops polling when leaving the live workspace', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    loggingApi.sendLog.mockImplementation((_logger, _level, _message, _context, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const view = openWorkspace();
    await ready();
    fireEvent.change(screen.getByLabelText('Log Message'), { target: { value: 'Pending' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Log/ }));
    const signal = loggingApi.sendLog.mock.calls[0][4].signal;
    view.unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => vi.advanceTimersByTimeAsync(6000));
    expect(loggingApi.getConfig).toHaveBeenCalledTimes(1);
  });

  it('does not move the page or console scroll position during polling', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
    openWorkspace();
    await ready();
    const feed = screen.getByRole('region', { name: 'Live log entries' });
    feed.scrollTop = 37;
    loggingApi.getLogs.mockResolvedValue([{ id: 'new-log', level: 'INFO', loggerName: 'AuthService', message: 'New entry' }]);
    await act(async () => vi.advanceTimersByTimeAsync(2100));
    expect(screen.getByText('New entry')).toBeInTheDocument();
    expect(feed.scrollTop).toBe(37);
    expect(scroll).not.toHaveBeenCalled();
  });

  it('ignores an older poll that finishes after a configuration change', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    openWorkspace('hierarchy');
    const threshold = await screen.findByLabelText('Root logger threshold');
    let releasePoll;
    const oldConfiguration = structuredClone(configuration);
    loggingApi.getConfig.mockImplementationOnce(() => new Promise((resolve) => { releasePoll = resolve; }));
    await act(async () => vi.advanceTimersByTimeAsync(2100));
    expect(releasePoll).toEqual(expect.any(Function));
    loggingApi.configure.mockImplementation(async (nextLevel) => {
      configuration.globalLevel = nextLevel;
      return structuredClone(configuration);
    });
    fireEvent.change(threshold, { target: { value: 'ERROR' } });
    await waitFor(() => expect(threshold).toHaveValue('ERROR'));
    await act(async () => releasePoll(oldConfiguration));
    expect(threshold).toHaveValue('ERROR');
  });

  it('does not show an old sink response after choosing another appender', async () => {
    openWorkspace('appenders');
    const file = await screen.findByRole('button', { name: 'FILE', exact: true });
    let releaseFile;
    loggingApi.getAppenderLogs.mockImplementation((type) => type === 'FILE'
      ? new Promise((resolve) => { releaseFile = resolve; })
      : Promise.resolve(['Database entry']));
    fireEvent.click(file);
    await waitFor(() => expect(releaseFile).toEqual(expect.any(Function)));
    fireEvent.click(screen.getByRole('button', { name: 'DATABASE', exact: true }));
    expect(await screen.findByText('Database entry')).toBeInTheDocument();
    await act(async () => releaseFile(['Old file entry']));
    expect(screen.queryByText('Old file entry')).not.toBeInTheDocument();
    expect(screen.getByText('Database entry')).toBeInTheDocument();
  });
});
