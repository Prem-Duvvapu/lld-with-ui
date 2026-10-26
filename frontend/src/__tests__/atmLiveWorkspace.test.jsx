// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AtmPage from '../lld/atm/AtmPage';
import * as api from '../lld/atm/api';
import { ApiError } from '../utils/api';

vi.mock('../lld/atm/api');
const account = { accountNumber: '1234567890', holderName: 'John Doe', balance: 10000, state: 'AUTHENTICATED' };
const inventory = { totalCash: 50000, inventory: { ONE_HUNDRED: 100, FIVE_HUNDRED: 80 } };
const withdrawal = { transactionId: 'TXN-1001', accountNumber: account.accountNumber, type: 'WITHDRAWAL', amount: 500, status: 'SUCCESS', dispensedNotes: { FIVE_HUNDRED: 1 } };
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function open() { return render(<MemoryRouter><AtmPage /></MemoryRouter>); }
async function insert() {
  fireEvent.click(screen.getByRole('button', { name: /Insert Selected Card/ }));
  await screen.findByText('Enter 4-Digit PIN');
}
async function login() {
  await insert();
  for (const key of ['1', '2', '3', '4', 'ENTER']) fireEvent.click(screen.getByRole('button', { name: key, exact: true }));
  await screen.findByText(account.accountNumber);
}
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear(); sessionStorage.clear();
  api.getDispenserStatus.mockResolvedValue(inventory);
  api.insertCard.mockResolvedValue({ state: 'CARD_INSERTED', cardNumber: '1111222233334444', accountNumber: account.accountNumber, holderName: account.holderName });
  api.authenticate.mockResolvedValue(account);
  api.getBalance.mockResolvedValue({ accountNumber: account.accountNumber, balance: 10000 });
  api.getTransactions.mockResolvedValue([]);
  api.withdraw.mockResolvedValue(withdrawal);
  api.deposit.mockResolvedValue({ ...withdrawal, transactionId: 'TXN-1002', type: 'DEPOSIT', dispensedNotes: undefined });
  api.ejectCard.mockResolvedValue({ state: 'IDLE', message: 'Card ejected. Session ended.' });
});

describe('ATM live terminal workspace', () => {
  it('reports inventory failure without presenting a fictitious zero and retries explicitly', async () => {
    api.getDispenserStatus.mockRejectedValueOnce(new ApiError(503, 'Cassette unavailable'));
    open();
    expect(await screen.findByRole('alert')).toHaveTextContent('Cassette unavailable');
    expect(screen.queryByText('₹0', { exact: true })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Retry inventory/ }));
    await screen.findByText('₹50,000');
    api.getDispenserStatus.mockRejectedValueOnce(new ApiError(503, 'Refresh unavailable'));
    fireEvent.click(screen.getByRole('button', { name: /Refresh inventory/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Refresh unavailable');
    expect(screen.getByText('₹50,000')).toBeInTheDocument();
  });

  it('guards repeated deposit submissions synchronously and freezes conflicting actions and drafts', async () => {
    const request = deferred();
    api.deposit.mockReturnValueOnce(request.promise);
    open(); await login();
    const deposit = screen.getByRole('button', { name: /Deposit Cash/ });
    act(() => { fireEvent.click(deposit); fireEvent.click(deposit); });
    expect(api.deposit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Withdraw Cash/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Eject Card/ })).toBeDisabled();
    expect(screen.getByLabelText('Amount (₹)')).toBeDisabled();
    await act(async () => request.resolve({ ...withdrawal, type: 'DEPOSIT' }));
    expect(screen.getByRole('button', { name: /Deposit Cash/ })).toBeEnabled();
  });

  it('pins the inserted card and provides a labeled PIN form with focus and one authentication request', async () => {
    const request = deferred();
    api.authenticate.mockReturnValueOnce(request.promise);
    open(); await insert();
    expect(screen.getByRole('button', { name: /Jane Smith/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Insert Selected Card/ })).toBeDisabled();
    const pin = screen.getByLabelText('4-digit PIN');
    expect(pin).toHaveFocus();
    fireEvent.change(pin, { target: { value: '1234' } });
    act(() => {
      fireEvent.submit(screen.getByRole('form', { name: 'Authenticate inserted card' }));
      fireEvent.submit(screen.getByRole('form', { name: 'Authenticate inserted card' }));
    });
    expect(api.authenticate).toHaveBeenCalledTimes(1);
    expect(pin).toBeDisabled();
    await act(async () => request.resolve(account));
    expect(screen.getByLabelText('Amount (₹)')).toHaveFocus();
    expect(screen.getByLabelText('Dispense strategy')).toHaveValue('MINIMIZE_NOTES');
  });

  it('keeps rejected PIN input and uses the typed blocked code, without parsing message text', async () => {
    api.authenticate.mockRejectedValueOnce(new ApiError(401, 'Invalid PIN! Attempts remaining: 2', { code: 'AuthenticationFailedException' }));
    open(); await insert();
    fireEvent.change(screen.getByLabelText('4-digit PIN'), { target: { value: '1111' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Authenticate inserted card' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Attempts remaining: 2');
    expect(screen.getByLabelText('4-digit PIN')).toHaveValue('1111');
    api.authenticate.mockRejectedValueOnce(new ApiError(403, 'Too many attempts', { code: 'CardBlockedException' }));
    fireEvent.submit(screen.getByRole('form', { name: 'Authenticate inserted card' }));
    await screen.findByRole('heading', { name: /CARD BLOCKED/ });
    expect(screen.getByRole('button', { name: /Eject Card/ })).toBeEnabled();
  });

  it('retains the authenticated account and reports an eject error instead of silently resetting', async () => {
    api.ejectCard.mockRejectedValueOnce(new ApiError(400, 'Terminal cannot eject now', { code: 'InvalidSessionStateException' }));
    open(); await login();
    fireEvent.click(screen.getByRole('button', { name: /Eject Card/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Terminal cannot eject now');
    expect(screen.getByText(account.accountNumber)).toBeInTheDocument();
    expect(screen.getByText('₹10000.00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Eject Card/ }));
    await screen.findByText('Please Select Card to Begin');
    expect(screen.getByRole('button', { name: /Insert Selected Card/ })).toHaveFocus();
  });

  it('retains confirmed reads and exposes independent retry when balance or history fails', async () => {
    open(); await login();
    api.getBalance.mockRejectedValueOnce(new ApiError(503, 'Balance unavailable'));
    fireEvent.click(screen.getByRole('button', { name: /Refresh Balance/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Balance unavailable');
    expect(screen.getByText('₹10000.00')).toBeInTheDocument();
    api.getBalance.mockResolvedValueOnce({ balance: 9500 });
    fireEvent.click(screen.getByRole('button', { name: /Retry balance/ }));
    await screen.findByText('₹9500.00');
    api.getTransactions.mockRejectedValueOnce(new ApiError(503, 'History unavailable'));
    fireEvent.click(screen.getByRole('button', { name: /Refresh transactions/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('History unavailable');
    api.getTransactions.mockResolvedValueOnce([withdrawal]);
    fireEvent.click(screen.getByRole('button', { name: /Retry transactions/ }));
    await screen.findByText('WITHDRAWAL');
  });

  it('preserves the last receipt and rejected draft, and refreshes Java-recorded failed transactions', async () => {
    open(); await login();
    fireEvent.click(screen.getByRole('button', { name: /Withdraw Cash/ }));
    await screen.findByText('Txn ID: TXN-1001');
    fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '20000' } });
    api.withdraw.mockRejectedValueOnce(new ApiError(400, 'Insufficient account balance', { code: 'InsufficientBalanceException' }));
    api.getTransactions.mockResolvedValueOnce([{ ...withdrawal, transactionId: 'TXN-1003', status: 'FAILED', amount: 20000 }]);
    fireEvent.click(screen.getByRole('button', { name: /Withdraw Cash/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Insufficient account balance');
    expect(screen.getByLabelText('Amount (₹)')).toHaveValue(20000);
    expect(screen.getByText('Txn ID: TXN-1001')).toBeInTheDocument();
    await screen.findByText('FAILED');
  });

  it('cancels pending reads on tab departure while retaining the confirmed session and ignoring late responses', async () => {
    open(); await login();
    const read = deferred();
    api.getBalance.mockReturnValueOnce(read.promise);
    fireEvent.click(screen.getByRole('button', { name: /Refresh Balance/ }));
    const signal = api.getBalance.mock.lastCall[1]?.signal;
    await act(async () => fireEvent.click(screen.getByRole('tab', { name: /Interactive 2D Simulation/ })));
    expect(signal?.aborted).toBe(true);
    await act(async () => read.resolve({ balance: 123 }));
    await act(async () => fireEvent.click(screen.getByRole('tab', { name: 'App', exact: true })));
    expect(screen.getByText(account.accountNumber)).toBeInTheDocument();
    expect(screen.queryByText('₹123.00')).not.toBeInTheDocument();
    expect(screen.getByText('₹10000.00')).toBeInTheDocument();
  });

  it('marks an interrupted deposit as uncertain, ignores late completion, and never repeats it on return', async () => {
    const request = deferred();
    api.deposit.mockReturnValueOnce(request.promise);
    open(); await login();
    fireEvent.click(screen.getByRole('button', { name: /Deposit Cash/ }));
    const signal = api.deposit.mock.lastCall[2]?.signal;
    await act(async () => fireEvent.click(screen.getByRole('tab', { name: /Interactive 2D Simulation/ })));
    expect(signal?.aborted).toBe(true);
    await act(async () => request.resolve({ ...withdrawal, type: 'DEPOSIT' }));
    await act(async () => fireEvent.click(screen.getByRole('tab', { name: 'App', exact: true })));
    expect(screen.getByRole('alert')).toHaveTextContent(/outcome.*unknown/i);
    expect(screen.getByRole('button', { name: /Deposit Cash/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Eject Card/ })).toBeEnabled();
    expect(api.deposit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Successfully deposited/)).not.toBeInTheDocument();
  });

  it('does not let a balance read started before a deposit replace the newer balance', async () => {
    open(); await login();
    const old = deferred();
    api.getBalance.mockReturnValueOnce(old.promise);
    fireEvent.click(screen.getByRole('button', { name: /Refresh Balance/ }));
    api.getBalance.mockResolvedValueOnce({ balance: 10500 });
    fireEvent.click(screen.getByRole('button', { name: /Deposit Cash/ }));
    await screen.findByText('₹10500.00');
    await act(async () => old.resolve({ balance: 10000 }));
    expect(screen.getByText('₹10500.00')).toBeInTheDocument();
    expect(screen.queryByText('₹10000.00')).not.toBeInTheDocument();
  });

  it('coalesces repeated balance reads and keeps the retry control focused', async () => {
    open(); await login();
    const read = deferred();
    api.getBalance.mockReturnValueOnce(read.promise);
    const refresh = screen.getByRole('button', { name: /Refresh Balance/ });
    refresh.focus();
    act(() => { fireEvent.click(refresh); fireEvent.click(refresh); });
    expect(api.getBalance).toHaveBeenCalledTimes(1);
    await act(async () => read.reject(new ApiError(503, 'Read failed')));
    const retry = screen.getByRole('button', { name: 'Retry balance' });
    expect(retry).toBe(refresh);
    expect(retry).toHaveFocus();
    await act(async () => fireEvent.click(retry));
    expect(screen.getByRole('button', { name: /Refresh Balance/ })).toHaveFocus();
  });

  it('serializes withdrawal form submissions and retains the strategy while Java rejects the amount', async () => {
    const request = deferred();
    open(); await login();
    fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '99' } });
    fireEvent.change(screen.getByLabelText('Dispense strategy'), { target: { value: 'CONSERVE_LARGE_NOTES' } });
    api.withdraw.mockReturnValueOnce(request.promise);
    const form = screen.getByRole('form', { name: 'ATM transaction' });
    act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    expect(api.withdraw).toHaveBeenCalledTimes(1);
    expect(api.withdraw.mock.lastCall.slice(0, 3)).toEqual([account.accountNumber, '99', 'CONSERVE_LARGE_NOTES']);
    expect(screen.getByLabelText('Dispense strategy')).toBeDisabled();
    await act(async () => request.reject(new ApiError(400, 'Withdrawal amount must be a positive multiple of ₹100', { code: 'InsufficientCashException' })));
    expect(screen.getByRole('alert')).toHaveTextContent('positive multiple');
    expect(screen.getByLabelText('Amount (₹)')).toHaveValue(99);
    expect(screen.getByLabelText('Dispense strategy')).toHaveValue('CONSERVE_LARGE_NOTES');
  });

  it('does not repeat an uncertain deposit and retains that warning if recovery eject fails', async () => {
    api.deposit.mockRejectedValueOnce(new ApiError(0, 'Connection lost'));
    open(); await login();
    fireEvent.click(screen.getByRole('button', { name: /Deposit Cash/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/deposit outcome is unknown/i);
    expect(screen.getByRole('alert')).toHaveFocus();
    expect(screen.getByRole('button', { name: /Deposit Cash/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Withdraw Cash/ })).toBeDisabled();
    api.ejectCard.mockRejectedValueOnce(new ApiError(400, 'Cannot eject now'));
    fireEvent.click(screen.getByRole('button', { name: /Eject Card/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/deposit outcome is unknown/i);
    expect(api.deposit).toHaveBeenCalledTimes(1);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Eject Card/ })));
    expect(screen.getByRole('button', { name: /Insert Selected Card/ })).toBeEnabled();
    expect(screen.queryByText(account.accountNumber)).not.toBeInTheDocument();
  });

  it('aborts live requests on route unmount and cannot attach their late results to a new terminal', async () => {
    const inventoryRequest = deferred();
    api.getDispenserStatus.mockReturnValueOnce(inventoryRequest.promise);
    const view = open();
    const signal = api.getDispenserStatus.mock.lastCall[0]?.signal;
    view.unmount();
    expect(signal?.aborted).toBe(true);
    open();
    await act(async () => inventoryRequest.resolve({ ...inventory, totalCash: 999 }));
    expect(screen.queryByText('₹999', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText('₹50,000')).toBeInTheDocument();
    expect(api.ejectCard).not.toHaveBeenCalled();
  });
});

