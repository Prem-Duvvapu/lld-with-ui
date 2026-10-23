// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import KvStorePage from '../lld/kvstore/KvStorePage';
import * as api from '../lld/kvstore/api';
import { ApiError } from '../utils/api';

vi.mock('../lld/kvstore/api');

const entry = { value: 'confirmed', version: 7, expiresAtEpoch: null };
function open(tab = 'store') {
  sessionStorage.setItem('lld-tab-kvstore', tab);
  return render(<MemoryRouter><KvStorePage /></MemoryRouter>);
}

beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  api.get.mockResolvedValue(entry);
  api.set.mockResolvedValue(entry);
  api.cas.mockResolvedValue({ ...entry, version: 8 });
  api.del.mockResolvedValue(null);
});

describe('KV live workspace', () => {
  it('retains a successful read and never turns a typed 503 into a missing-key result', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'GET', exact: true }));
    await waitFor(() => expect(document.body.textContent).toContain('confirmed'));
    api.get.mockRejectedValueOnce(new ApiError(503, 'Temporarily unavailable', { code: 'SERVICE_UNAVAILABLE' }));
    fireEvent.click(screen.getByRole('button', { name: 'GET', exact: true }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Temporarily unavailable');
    expect(screen.queryByText(/miss \(404\)/)).not.toBeInTheDocument();
    expect(document.body.textContent).toContain('confirmed');
  });

  it('blocks duplicate SET requests while the first request is pending', async () => {
    let finish;
    api.set.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    open();
    const button = screen.getByRole('button', { name: 'SET', exact: true });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.submit(screen.getByRole('form', { name: 'Set a key' }));
    expect(api.set).toHaveBeenCalledTimes(1);
    await act(async () => finish(entry));
  });

  it('distinguishes a Java missing-key response from a route 404 and retains the previous record', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'GET', exact: true }));
    await screen.findByRole('region', { name: 'Last confirmed record' });
    api.get.mockRejectedValueOnce(new ApiError(404, 'No entry for key', { code: 'KeyNotFoundException' }));
    fireEvent.click(screen.getByRole('button', { name: 'GET', exact: true }));
    await screen.findByText(/server reported.*not found \(404\)/);
    expect(within(screen.getByRole('region', { name: 'Last confirmed record' })).getByText('7')).toBeInTheDocument();
    api.get.mockRejectedValueOnce(new ApiError(404, 'Route not found', { error: 'Not Found' }));
    fireEvent.click(screen.getByRole('button', { name: 'GET', exact: true }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Route not found');
    expect(screen.queryByText(/server reported.*not found/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry GET "welcome"' })).toBeEnabled();
  });

  it('retries the failed read key explicitly without overwriting a newly edited draft', async () => {
    api.get.mockRejectedValueOnce(new ApiError(503, 'Read unavailable'));
    open();
    fireEvent.click(screen.getByRole('button', { name: 'GET', exact: true }));
    await screen.findByRole('alert');
    fireEvent.change(screen.getByLabelText('Key to GET'), { target: { value: 'other' } });
    fireEvent.click(screen.getByRole('button', { name: 'Retry GET "welcome"' }));
    await screen.findByRole('region', { name: 'Last confirmed record' });
    expect(api.get.mock.lastCall[0]).toBe('welcome');
    expect(screen.getByLabelText('Key to GET')).toHaveValue('other');
  });

  it('validates labeled fields without sending invalid requests and accepts an empty string value', async () => {
    open();
    fireEvent.change(screen.getByLabelText('TTL seconds (optional)'), { target: { value: '1.5' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Set a key' }));
    expect(screen.getByLabelText('TTL seconds (optional)')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('TTL seconds (optional)')).toHaveFocus();
    expect(api.set).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('TTL seconds (optional)'), { target: { value: '' } });
    api.set.mockResolvedValueOnce({ ...entry, value: '' });
    fireEvent.submit(screen.getByRole('form', { name: 'Set a key' }));
    await screen.findByRole('region', { name: 'Last confirmed record' });
    expect(api.set).toHaveBeenCalledWith('welcome', '', undefined, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(within(screen.getByRole('region', { name: 'Last confirmed record' })).getAllByText('""')).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Key to GET'), { target: { value: '   ' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Read a key' }));
    expect(api.get).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Key to GET')).toHaveFocus();
  });

  it('keeps rejected SET drafts and allows an explicit retry after a definitive client error', async () => {
    api.set.mockRejectedValueOnce(new ApiError(400, 'Rejected value'));
    open();
    fireEvent.change(screen.getByLabelText('Value to SET'), { target: { value: 'keep my value' } });
    fireEvent.click(screen.getByRole('button', { name: 'SET', exact: true }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Rejected value');
    expect(screen.getByLabelText('Value to SET')).toHaveValue('keep my value');
    expect(screen.getByRole('button', { name: 'SET', exact: true })).toBeEnabled();
    expect(screen.queryByText(/outcome of SET/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'SET', exact: true }));
    await screen.findByRole('region', { name: 'Last confirmed record' });
    expect(api.set).toHaveBeenCalledTimes(2);
  });

  it('refreshes a conflicted CAS version without changing the proposed value or retrying automatically', async () => {
    api.cas.mockRejectedValueOnce(new ApiError(409, 'Expected 1 but was 7', { code: 'VersionConflictException' }));
    open('cas');
    fireEvent.change(screen.getByLabelText('New value'), { target: { value: 'proposed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Attempt CAS' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('New value')).toHaveValue('proposed');
    expect(screen.getByLabelText('Expected version')).toHaveValue(1);
    fireEvent.click(screen.getByRole('button', { name: 'Read current version' }));
    await waitFor(() => expect(screen.getByLabelText('Expected version')).toHaveValue(7));
    expect(screen.getByLabelText('New value')).toHaveValue('proposed');
    expect(api.cas).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Attempt CAS' }));
    await waitFor(() => expect(api.cas).toHaveBeenCalledTimes(2));
    expect(api.cas.mock.lastCall.slice(0, 3)).toEqual(['welcome', 7, 'proposed']);
  });

  it('rejects a fractional CAS version and blocks duplicate CAS submissions', async () => {
    let finish;
    api.cas.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    open('cas');
    fireEvent.change(screen.getByLabelText('Expected version'), { target: { value: '1.5' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Compare and swap a key' }));
    expect(api.cas).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Expected version'), { target: { value: '7' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Compare and swap a key' }));
    fireEvent.submit(screen.getByRole('form', { name: 'Compare and swap a key' }));
    expect(api.cas).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('New value')).toBeDisabled();
    await act(async () => finish({ ...entry, version: 8 }));
  });

  it('aborts on tab departure and never lets an old response unlock or replace a newer read', async () => {
    let first, second;
    api.get.mockImplementationOnce(() => new Promise(resolve => { first = resolve; }))
      .mockImplementationOnce(() => new Promise(resolve => { second = resolve; }));
    open();
    fireEvent.click(screen.getByRole('button', { name: 'GET', exact: true }));
    const oldSignal = api.get.mock.calls[0][1].signal;
    fireEvent.click(screen.getByRole('tab', { name: /CAS/ }));
    expect(oldSignal.aborted).toBe(true);
    fireEvent.click(screen.getByRole('tab', { name: /Store/ }));
    fireEvent.click(screen.getByRole('button', { name: 'GET', exact: true }));
    await act(async () => first({ ...entry, value: 'obsolete' }));
    expect(screen.getByRole('button', { name: 'GET', exact: true })).toBeDisabled();
    expect(screen.queryByRole('region', { name: 'Last confirmed record' })).not.toBeInTheDocument();
    await act(async () => second({ ...entry, value: 'latest' }));
    expect(await screen.findByRole('region', { name: 'Last confirmed record' })).toHaveTextContent('latest');
    expect(screen.getByRole('button', { name: 'GET', exact: true })).toBeEnabled();
  });

  it('stops waiting and still aborts a subsequent request when the module unmounts', async () => {
    let old, current;
    api.get.mockImplementationOnce(() => new Promise(resolve => { old = resolve; }))
      .mockImplementationOnce(() => new Promise(resolve => { current = resolve; }));
    const mounted = open();
    fireEvent.click(screen.getByRole('button', { name: 'GET', exact: true }));
    const oldSignal = api.get.mock.calls[0][1].signal;
    fireEvent.click(screen.getByRole('button', { name: 'Stop waiting' }));
    expect(oldSignal.aborted).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Retry GET "welcome"' }));
    const newSignal = api.get.mock.calls[1][1].signal;
    expect(newSignal.aborted).toBe(false);
    await act(async () => old({ ...entry, value: 'ignored' }));
    expect(screen.getByRole('button', { name: 'GET', exact: true })).toBeDisabled();
    mounted.unmount();
    expect(newSignal.aborted).toBe(true);
    await act(async () => current(entry));
  });

  it.each([0, 503])('requires inspection and a user decision after an uncertain SET failure (%s)', async status => {
    api.set.mockRejectedValueOnce(new ApiError(status, 'Write outcome unknown'));
    open();
    fireEvent.change(screen.getByLabelText('Value to SET'), { target: { value: 'preserve this draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'SET', exact: true }));
    await screen.findByText(/outcome of SET.*unknown/);
    expect(screen.getByRole('button', { name: 'SET', exact: true })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Allow another write' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Inspect current key' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Allow another write' })).toBeEnabled());
    expect(api.set).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/does not cancel an earlier request/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Allow another write' }));
    expect(screen.getByRole('button', { name: 'SET', exact: true })).toBeEnabled();
    expect(screen.getByLabelText('Value to SET')).toHaveValue('preserve this draft');
  });

  it('preserves drafts and marks an interrupted write uncertain after leaving and returning', async () => {
    let finish;
    api.set.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    open();
    fireEvent.change(screen.getByLabelText('Value to SET'), { target: { value: 'draft before navigation' } });
    fireEvent.click(screen.getByRole('button', { name: 'SET', exact: true }));
    const signal = api.set.mock.calls[0][3].signal;
    fireEvent.click(screen.getByRole('tab', { name: /CAS/ }));
    expect(signal.aborted).toBe(true);
    fireEvent.click(screen.getByRole('tab', { name: /Store/ }));
    expect(screen.getByLabelText('Value to SET')).toHaveValue('draft before navigation');
    expect(screen.getByRole('button', { name: 'SET', exact: true })).toBeDisabled();
    await act(async () => finish({ ...entry, value: 'late acknowledgement' }));
    expect(screen.queryByRole('region', { name: 'Last confirmed record' })).not.toBeInTheDocument();
    api.get.mockRejectedValueOnce(new ApiError(404, 'Key is missing', { code: 'KeyNotFoundException' }));
    fireEvent.click(screen.getByRole('button', { name: 'Inspect current key' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Allow another write' })).toBeEnabled());
    expect(api.simReset).not.toHaveBeenCalled();
  });

  it('confirms DELETE, focuses safe cancellation, guards duplicate deletion and restores stable focus', async () => {
    let finish;
    api.del.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    open();
    fireEvent.click(screen.getByRole('button', { name: 'SET', exact: true }));
    const trigger = await screen.findByRole('button', { name: 'Delete recent key welcome' });
    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(api.del).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Cancel' }), { key: 'Escape' });
    expect(screen.getByRole('heading', { name: 'SET', exact: true })).toHaveFocus();
    fireEvent.click(trigger);
    const confirm = screen.getByRole('button', { name: 'Confirm delete' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(api.del).toHaveBeenCalledTimes(1);
    await act(async () => finish(null));
    expect(screen.queryByRole('region', { name: 'Last confirmed record' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete recent key welcome' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'SET', exact: true })).toHaveFocus();
  });

  it('keeps a bounded per-key response history without deleting server keys', async () => {
    open();
    for (let index = 0; index < 12; index++) {
      fireEvent.change(screen.getByLabelText('Key to SET'), { target: { value: `key-${index}` } });
      fireEvent.click(screen.getByRole('button', { name: 'SET', exact: true }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'SET', exact: true })).toBeEnabled());
    }
    fireEvent.click(screen.getByRole('button', { name: 'SET', exact: true }));
    await waitFor(() => expect(api.set).toHaveBeenCalledTimes(13));
    const history = screen.getByRole('region', { name: 'Recent successful SET responses' });
    expect(within(history).getAllByRole('listitem')).toHaveLength(10);
    expect(within(history).queryByText('"key-0"')).not.toBeInTheDocument();
    expect(api.del).not.toHaveBeenCalled();
  });

  it('handles a malformed successful response as a read failure without fabricating state', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'GET', exact: true }));
    await screen.findByRole('region', { name: 'Last confirmed record' });
    api.get.mockResolvedValueOnce({ value: 'bad version', version: '8' });
    fireEvent.click(screen.getByRole('button', { name: 'GET', exact: true }));
    expect(await screen.findByRole('alert')).toHaveTextContent('cannot display reliably');
    expect(screen.getByRole('region', { name: 'Last confirmed record' })).toHaveTextContent('confirmed');
    expect(screen.queryByText(/server reported.*not found/)).not.toBeInTheDocument();
  });
});
