// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AtmPage from '../lld/atm/AtmPage';
import * as api from '../lld/atm/api';

vi.mock('../lld/atm/api');
vi.mock('../components/LldPage', () => ({ default: ({ children }) => <div>{children('simulation')}</div> }));
const bob = { accountNumber: 'ACC-SIM-2', holderName: 'Sim Bob', balance: 5000 };
const card = { cardNumber: 'CARD-SIM-2', pin: '5678', accountNumber: bob.accountNumber, blocked: false };
const state = (balance = 5000, simState = 'AUTHENTICATED', extra = {}) => ({ simState,
  activeAccount: simState === 'IDLE' ? null : { ...bob, balance }, activeCard: simState === 'IDLE' ? null : card,
  accounts: [{ ...bob, balance }], cards: [card], inventory: { ONE_HUNDRED: 50 },
  dispenserCash: 25000 + balance, events: [], ...extra,
});
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
async function start() {
  render(<AtmPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Load current sandbox' }));
  await screen.findByRole('button', { name: 'Withdraw', exact: true });
}
async function readyBurst() {
  await start(); fireEvent.click(screen.getByRole('button', { name: 'Withdraw', exact: true }));
  await screen.findByRole('button', { name: 'Send 10 withdrawal requests', exact: true });
}
beforeEach(() => {
  vi.resetAllMocks();
  api.simGetState.mockResolvedValue(state());
  api.simReset.mockResolvedValue(state(5000, 'IDLE'));
  api.simInsertCard.mockResolvedValue(state(5000, 'CARD_INSERTED'));
  api.simAuthenticate.mockResolvedValue(state());
  api.simWithdraw.mockResolvedValue(state(4700, 'AUTHENTICATED', { withdrawalOutcome: 'SUCCESS' }));
});

describe('ATM sandbox confirmed-state workspace', () => {
  it('opens with an explicit read and never resets on render', async () => {
    render(<AtmPage />); expect(api.simReset).not.toHaveBeenCalled(); expect(api.simGetState).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Load current sandbox' }));
    await screen.findByRole('button', { name: 'Withdraw', exact: true });
    expect(api.simReset).not.toHaveBeenCalled();
  });

  it('counts approvals rather than HTTP success and reads final state after every response settles', async () => {
    await readyBurst(); const responses = Array.from({ length: 10 }, () => deferred());
    for (const response of responses) api.simWithdraw.mockReturnValueOnce(response.promise);
    api.simGetState.mockResolvedValueOnce(state(500));
    fireEvent.click(screen.getByRole('button', { name: 'Send 10 withdrawal requests' }));
    expect(api.simWithdraw).toHaveBeenCalledTimes(11);
    // Resolve the last request first; arrival/input order does not establish final state.
    await act(async () => { for (let i = 9; i > 0; i--) responses[i].resolve(state(4700 - i * 600, 'AUTHENTICATED', { withdrawalOutcome: i < 7 ? 'SUCCESS' : 'INSUFFICIENT_BALANCE' })); });
    expect(api.simGetState).toHaveBeenCalledTimes(1);
    await act(async () => responses[0].resolve(state(4100, 'AUTHENTICATED', { withdrawalOutcome: 'SUCCESS' })));
    await screen.findByText('7 approved responses from 10 requests.');
    expect(screen.getByText('₹500.00')).toBeInTheDocument();
    expect(screen.queryByText('₹4100.00')).not.toBeInTheDocument();
    expect(screen.queryByText(/Race Winners|exactly one win|10-Thread/)).not.toBeInTheDocument();
    expect(api.simGetState).toHaveBeenCalledTimes(2);
  });

  it('retains confirmed state and drafts when final read fails; Retry only reads and never repeats withdrawals', async () => {
    await readyBurst();
    api.simWithdraw.mockResolvedValue(state(500, 'AUTHENTICATED', { withdrawalOutcome: 'SUCCESS' }));
    api.simGetState.mockRejectedValueOnce(new Error('Final state unavailable')).mockResolvedValueOnce(state(500));
    fireEvent.click(screen.getByRole('button', { name: 'Send 10 withdrawal requests' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Final state unavailable');
    expect(screen.getByRole('button', { name: 'Retry state refresh' })).toHaveFocus();
    expect(screen.getByText('₹4700.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send 10 withdrawal requests' })).toBeDisabled();
    const calls = api.simWithdraw.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Retry state refresh' }));
    await screen.findByRole('button', { name: /Eject Card/ });
    expect(screen.getByText('₹500.00')).toBeInTheDocument();
    expect(api.simWithdraw).toHaveBeenCalledTimes(calls);
  });

  it('guards duplicate operations synchronously and freezes their drafts', async () => {
    await start(); const request = deferred(); api.simWithdraw.mockReturnValueOnce(request.promise);
    fireEvent.change(screen.getByLabelText('Sandbox withdrawal amount (₹)'), { target: { value: '700' } });
    const submit = screen.getByRole('button', { name: 'Withdraw', exact: true });
    act(() => { fireEvent.click(submit); fireEvent.click(submit); });
    expect(api.simWithdraw).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Sandbox withdrawal amount (₹)')).toBeDisabled();
    expect(screen.getByLabelText('Sandbox dispense strategy')).toBeDisabled();
    await act(async () => request.reject(new Error('Response lost')));
    expect(await screen.findByRole('alert')).toHaveTextContent('Response lost');
    expect(screen.getByLabelText('Sandbox withdrawal amount (₹)')).toHaveValue(700);
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry state refresh' }));
    await waitFor(() => expect(submit).toBeEnabled());
    expect(api.simWithdraw).toHaveBeenCalledTimes(1);
  });

  it('does not advance past a declined withdrawal or a failed PIN', async () => {
    api.simGetState.mockResolvedValueOnce(state(5000, 'CARD_INSERTED'));
    api.simAuthenticate.mockResolvedValueOnce(state(5000, 'CARD_INSERTED'));
    await startInserted();
    fireEvent.click(screen.getByRole('button', { name: 'Authenticate', exact: true }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect PIN');
    expect(screen.getByLabelText('Sandbox PIN')).toBeEnabled();
    expect(screen.getByLabelText('Sandbox PIN')).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Authenticate', exact: true }));
    await screen.findByRole('button', { name: 'Withdraw', exact: true });
    api.simWithdraw.mockResolvedValueOnce(state(5000, 'AUTHENTICATED', { withdrawalOutcome: 'INSUFFICIENT_BALANCE' }));
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw', exact: true }));
    expect(await screen.findByRole('alert')).toHaveTextContent('not approved');
    expect(screen.queryByRole('button', { name: 'Send 10 withdrawal requests' })).not.toBeInTheDocument();
  });

  it('labels unconfirmed responses as unknown and still refreshes authoritative state', async () => {
    await readyBurst(); api.simWithdraw.mockRejectedValueOnce(new Error('Lost response'));
    api.simGetState.mockResolvedValueOnce(state(500));
    fireEvent.click(screen.getByRole('button', { name: 'Send 10 withdrawal requests' }));
    await screen.findByText(/1 responses were not confirmed; their outcome is unknown/);
    expect(screen.getByText('₹500.00')).toBeInTheDocument();
  });

  it('keeps a malformed final response from replacing the confirmed balance', async () => {
    await readyBurst(); api.simGetState.mockResolvedValueOnce(null).mockResolvedValueOnce(state(500));
    fireEvent.click(screen.getByRole('button', { name: 'Send 10 withdrawal requests' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('incomplete');
    expect(screen.getByText('₹4700.00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry state refresh' }));
    await screen.findByText('₹500.00');
    expect(api.simWithdraw).toHaveBeenCalledTimes(11);
  });

  it('aborts every in-flight burst request and skips a final read after departure', async () => {
    const view = render(<AtmPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Load current sandbox' }));
    await screen.findByRole('button', { name: 'Withdraw', exact: true });
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw', exact: true }));
    await screen.findByRole('button', { name: 'Send 10 withdrawal requests' });
    const request = deferred(); api.simWithdraw.mockReturnValue(request.promise);
    fireEvent.click(screen.getByRole('button', { name: 'Send 10 withdrawal requests' }));
    const signals = api.simWithdraw.mock.calls.slice(1).map(call => call[3].signal);
    view.unmount(); expect(signals).toHaveLength(10); expect(signals.every(signal => signal.aborted)).toBe(true);
    await act(async () => request.resolve(state(500, 'AUTHENTICATED', {withdrawalOutcome:'SUCCESS'})));
    expect(api.simGetState).toHaveBeenCalledTimes(1);
  });

  it('aborts a pending request on departure and ignores its late response', async () => {
    const response = deferred(); api.simGetState.mockReturnValueOnce(response.promise);
    const view = render(<AtmPage />); fireEvent.click(screen.getByRole('button', { name: 'Load current sandbox' }));
    const signal = api.simGetState.mock.calls[0][0].signal; view.unmount(); expect(signal.aborted).toBe(true);
    await act(async () => response.resolve(state()));
    expect(api.simWithdraw).not.toHaveBeenCalled();
  });
});
async function startInserted() {
  render(<AtmPage />); fireEvent.click(screen.getByRole('button', { name: 'Load current sandbox' }));
  await screen.findByRole('button', { name: 'Authenticate', exact: true });
}
