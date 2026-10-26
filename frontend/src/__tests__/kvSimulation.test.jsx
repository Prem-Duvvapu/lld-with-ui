// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import KvStorePage from '../lld/kvstore/KvStorePage';
import * as api from '../lld/kvstore/api';

vi.mock('../lld/kvstore/api');
const event = { id: 1, timestamp: '12:00:00.000', actor: 'System', type: 'SIM_RESET', description: 'Server reset' };
const empty = { entries: {}, wal: [], walSize: 0, events: [event], eventCount: 1, storedEntryCount: 0, readableEntryCount: 0, expiredKeys: [], snapshotAtEpoch: 1792800000000 };
const written = { ...empty, entries: { 'demo-key': { value: 'from server', version: 7, expiresAtEpoch: null } }, storedEntryCount: 1, readableEntryCount: 1, wal: ['server SET'], walSize: 1 };
const raced = { ...written, raceResult: { workers: 4, won: 1, lost: 3, expectedVersion: 1, finalVersion: 2 } };
function open() { sessionStorage.setItem('lld-tab-kvstore', 'sim'); return render(<MemoryRouter><KvStorePage /></MemoryRouter>); }
async function advance(count) {
  fireEvent.click(screen.getByRole('button', { name: count === 1 ? 'Start simulation' : 'Next step', exact: true }));
  await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('value', String(count)));
}
beforeEach(() => {
  vi.resetAllMocks(); sessionStorage.clear(); localStorage.clear();
  api.simReset.mockResolvedValue(empty);
  api.simSet.mockResolvedValue(written); api.simGet.mockResolvedValue(written); api.simReplay.mockResolvedValue(written);
  api.simTtlDemo.mockResolvedValue({ ...written, storedEntryCount: 2, expiredKeys: ['ttl-demo-key'] });
  api.simCasRace.mockResolvedValue(raced); api.simGetSnapshot.mockResolvedValue(raced);
});
afterEach(() => vi.useRealTimers());

describe('KV shared simulation', () => {
  it('runs seven acknowledged steps including the final backend read, with the selected configuration', async () => {
    open();
    expect(api.simReset).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('CAS workers'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Example value'), { target: { value: '' } });
    await advance(1); expect(screen.getByLabelText('CAS workers')).toBeEnabled();
    await advance(2); expect(screen.getByLabelText('CAS workers')).toBeDisabled();
    for (let count = 3; count <= 7; count++) await advance(count);
    expect(api.simSet).toHaveBeenCalledWith('demo-key', '', undefined, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(api.simGet).toHaveBeenCalledWith('demo-key', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(api.simReplay).toHaveBeenCalledTimes(1); expect(api.simTtlDemo).toHaveBeenCalledTimes(1);
    expect(api.simCasRace).toHaveBeenCalledWith(4, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(api.simGetSnapshot).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('region', { name: 'Recorded CAS race result' })).toHaveTextContent('Workers4Won1Lost3');
    expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
    expect(api.set).not.toHaveBeenCalled(); expect(api.get).not.toHaveBeenCalled(); expect(api.cas).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1'));
    expect(screen.queryByRole('region', { name: 'Recorded CAS race result' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('CAS workers')).toHaveValue('4'); expect(screen.getByLabelText('CAS workers')).toBeEnabled();
  });

  it('guards rapid start/reset actions and freezes settings until the current response arrives', async () => {
    let finish;
    api.simReset.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    open();
    const start = screen.getByRole('button', { name: 'Start simulation' });
    fireEvent.click(start); fireEvent.click(start); fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    expect(api.simReset).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Example value')).toBeDisabled();
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0');
    await act(async () => finish(empty));
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1');
  });

  it('retains the last confirmed snapshot and requires reset after a failed write', async () => {
    api.simSet.mockRejectedValueOnce(new Error('Response lost'));
    open(); await advance(1);
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Response lost');
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1');
    expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
    expect(screen.getByText('The last confirmed snapshot is retained below. It may predate the failed action.')).toBeInTheDocument();
    expect(api.simSet).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next step' })).toBeEnabled());
  });

  it('aborts pending requests on a built-in tab, preserves settings, and starts a fresh walkthrough on return', async () => {
    let finish;
    api.simReset.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    open();
    fireEvent.change(screen.getByLabelText('CAS workers'), { target: { value: '16' } });
    fireEvent.change(screen.getByLabelText('Example value'), { target: { value: 'retained setting' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start simulation' }));
    const signal = api.simReset.mock.calls[0][0].signal;
    fireEvent.click(screen.getByRole('tab', { name: 'Design Details' }));
    expect(signal.aborted).toBe(true);
    await act(async () => finish(written));
    fireEvent.click(screen.getByRole('tab', { name: /Concurrency Sim/ }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0');
    expect(screen.getByLabelText('CAS workers')).toHaveValue('16');
    expect(screen.getByLabelText('Example value')).toHaveValue('retained setting');
    expect(api.simReset).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('heading', { name: 'Last confirmed sandbox snapshot' })).not.toBeInTheDocument();
  });

  it('pauses upcoming playback while allowing a pending response to finish', async () => {
    vi.useFakeTimers(); let finish;
    api.simReset.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    open(); fireEvent.click(screen.getByRole('button', { name: 'Play', exact: true }));
    await act(async () => vi.advanceTimersByTimeAsync(1600));
    fireEvent.click(screen.getByRole('button', { name: 'Pause', exact: true }));
    await act(async () => { finish(empty); });
    await act(async () => vi.advanceTimersByTimeAsync(10_000));
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1');
    expect(api.simSet).not.toHaveBeenCalled();
  });

  it('bounds displayed events/commands, pages mappings, and uses Java readability rather than browser time', async () => {
    const entries = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`key-${String(i).padStart(2, '0')}`, { value: 'snapshot value', version: 3, expiresAtEpoch: 0 }]));
    api.simReset.mockResolvedValueOnce({ ...empty, entries, storedEntryCount: 60, readableEntryCount: 9,
      expiredKeys: ['key-00'], wal: Array.from({ length: 90 }, (_, i) => `command-${i}`), walSize: 90,
      events: Array.from({ length: 120 }, (_, i) => ({ ...event, id: i, description: `event-${i}` })), eventCount: 120 });
    open(); await advance(1);
    const mappings = screen.getByRole('region', { name: 'Retained sandbox mappings' });
    expect(within(mappings).getAllByRole('row')).toHaveLength(26);
    expect(within(mappings).getAllByText('Expired; retained')).toHaveLength(1);
    expect(within(mappings).getAllByText('Readable at capture')).toHaveLength(24);
    const readable = screen.getByText('Readable entries').parentElement;
    expect(readable).toHaveTextContent('9'); // deliberately independent from the browser's clock/list arithmetic
    expect(within(screen.getByRole('region', { name: 'Sandbox event log' })).getAllByRole('listitem')).toHaveLength(50);
    expect(within(screen.getByRole('region', { name: 'In-memory command log' })).getAllByRole('listitem')).toHaveLength(50);
    expect(screen.queryByText('command-0')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next mappings' }));
    expect(within(mappings).queryByText('"key-00"')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next mappings' }));
    expect(within(mappings).getAllByRole('row')).toHaveLength(11);
    expect(screen.getByRole('button', { name: 'Next mappings' })).toBeDisabled();
  });

  it('stops on malformed snapshots and missing race outcomes instead of advancing invented progress', async () => {
    api.simReset.mockResolvedValueOnce(null); open();
    fireEvent.click(screen.getByRole('button', { name: 'Start simulation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('usable sandbox snapshot');
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0');
    fireEvent.click(screen.getByRole('button', { name: 'Reset sandbox' }));
    await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1'));
    for (let count = 2; count <= 5; count++) await advance(count);
    api.simCasRace.mockResolvedValueOnce(written);
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('did not include its outcome');
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '5');
  });
});
