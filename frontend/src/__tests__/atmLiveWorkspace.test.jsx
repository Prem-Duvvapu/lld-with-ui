// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AtmPage from '../lld/atm/AtmPage';
import * as api from '../lld/atm/api';
import { ApiError } from '../utils/api';

vi.mock('../lld/atm/api');
const STORAGE_KEY = 'lld-atm-terminal-v1';
const account = { accountNumber: '1234567890', holderName: 'John Doe', balance: 10000 };
const inventory = { totalCash: 50000, inventory: { ONE_HUNDRED: 100, FIVE_HUNDRED: 80 } };
const withdrawal = { transactionId: 'TXN-1001', accountNumber: account.accountNumber, type: 'WITHDRAWAL', amount: 500, status: 'SUCCESS', dispensedNotes: { FIVE_HUNDRED: 1 } };
let server;
function snapshot(overrides = {}) {
  return { state: 'IDLE', owned: false, bootId: 'boot-1', revision: 0, expiresAt: null,
    pinAttemptsRemaining: null, cardNumber: null, account: null, transactions: [], dispenser: inventory, ...overrides };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function open() { return render(<MemoryRouter><AtmPage /></MemoryRouter>); }
async function ready() { await waitFor(() => expect(screen.getByRole('button', { name: /Insert Selected Card/ })).toBeEnabled()); }
async function insert() {
  await ready();
  fireEvent.click(screen.getByRole('button', { name: /Insert Selected Card/ }));
  const pin = await screen.findByLabelText('4-digit PIN');
  await waitFor(() => expect(pin).toBeEnabled());
}
async function login() {
  await insert();
  fireEvent.change(screen.getByLabelText('4-digit PIN'), { target: { value: '1234' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Authenticate inserted card' }));
  await waitFor(() => expect(screen.getByLabelText('Amount (₹)')).toBeEnabled());
}
function command(name) { return api.sendTerminalCommand.mock.calls.filter(call => call[2].operation === name); }
function click(name) { fireEvent.click(screen.getByRole('button', { name })); }
function defaultCommand(_token, requestId, body) {
  const name = body.operation;
  server = { ...server, revision: server.revision + 1 };
  let result;
  if (name === 'insert') {
    server = { ...server, state: 'CARD_INSERTED', owned: true, cardNumber: body.payload.cardNumber, pinAttemptsRemaining: 3, expiresAt: Date.now() + 600000 };
    result = { state: server.state, cardNumber: body.payload.cardNumber, holderName: account.holderName };
  } else if (name === 'authenticate') {
    server = { ...server, state: 'AUTHENTICATED', account, pinAttemptsRemaining: null };
    result = { ...account, state: server.state };
  } else if (name === 'eject') {
    server = snapshot({ revision: server.revision });
    result = { state: 'IDLE', message: 'Card ejected. Session ended.' };
  } else {
    const amount = body.payload.amount;
    result = { ...withdrawal, amount, ...(name === 'deposit' ? { type: 'DEPOSIT', dispensedNotes: undefined } : {}) };
    server = { ...server, account: { ...server.account, balance: server.account.balance + (name === 'deposit' ? amount : -amount) },
      transactions: [...server.transactions, result] };
  }
  return Promise.resolve({ requestId, replayed: false, result, snapshot: server });
}
beforeEach(() => {
  vi.restoreAllMocks(); vi.resetAllMocks();
  localStorage.clear(); sessionStorage.clear();
  server = snapshot();
  api.getTerminalState.mockImplementation(async () => server);
  api.sendTerminalCommand.mockImplementation(defaultCommand);
  api.getTerminalRequest.mockImplementation(async () => ({ status: 'NOT_FOUND', outcome: null, snapshot: server }));
});

afterEach(() => vi.unstubAllGlobals());

describe('ATM owned live workspace', () => {
  it('checks ownership before enabling insertion, reports initial read failure, and retries without fake zero cash', async () => {
    api.getTerminalState.mockRejectedValueOnce(new ApiError(503, 'Terminal unavailable'));
    open();
    expect(screen.getByRole('button', { name: /Insert Selected Card/ })).toBeDisabled();
    expect(await screen.findByRole('alert')).toHaveTextContent('Terminal unavailable');
    expect(screen.queryByText('Please Select Card to Begin')).not.toBeInTheDocument();
    expect(screen.queryByText('₹0', { exact: true })).not.toBeInTheDocument();
    click('Retry terminal state'); await ready();
    expect(screen.getByText('₹50,000')).toBeInTheDocument();
  });

  it('uses different tab tokens and never adopts or ejects another owner, even with unexpected private fields', async () => {
    const first = open(); await login();
    const firstToken = command('insert')[0][0];
    first.unmount(); sessionStorage.clear();
    server = snapshot({ state: 'BUSY', account, transactions: [withdrawal], cardNumber: 'foreign-card', expiresAt: Date.now() + 600000 });
    open(); await screen.findByText('Terminal in use by another session');
    expect(api.getTerminalState.mock.lastCall[0]).not.toBe(firstToken);
    expect(screen.getByText(/Session expires at/)).toBeInTheDocument();
    expect(screen.queryByText(account.accountNumber)).not.toBeInTheDocument();
    expect(screen.queryByText('₹10000.00')).not.toBeInTheDocument();
    expect(screen.queryByText(/resets a terminal/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Eject Card/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Insert Selected Card/ })).toBeDisabled();
    click(/Eject Card/); expect(command('eject')).toHaveLength(0);
    server = snapshot({ revision: 4 }); click('Refresh terminal state'); await ready();
  });

  it('uses the coordinated response for account, history and inventory and focuses the confirmed receipt', async () => {
    open(); await login();
    expect(screen.getByLabelText('Amount (₹)')).toHaveFocus();
    click(/Withdraw Cash/); await screen.findByText('Txn ID: TXN-1001');
    expect(screen.getByText('₹9500.00')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Transaction Receipt/ })).toHaveFocus();
    expect(api.getBalance).not.toHaveBeenCalled(); expect(api.getTransactions).not.toHaveBeenCalled();
    expect(api.getDispenserStatus).not.toHaveBeenCalled(); expect(api.withdraw).not.toHaveBeenCalled();
    expect(command('withdraw')[0][2]).toEqual({ operation: 'withdraw', expectedRevision: 2, bootId: 'boot-1',
      payload: { accountNumber: account.accountNumber, amount: 500, mode: 'MINIMIZE_NOTES' } });
  });

  it('synchronously serializes deposits, freezes drafts and conflicting controls, and saves recovery before send', async () => {
    open(); await login(); const request = deferred();
    api.sendTerminalCommand.mockImplementationOnce((_token, _id, body) => {
      expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)).command.body).toEqual(body);
      return request.promise;
    });
    const deposit = screen.getByRole('button', { name: /Deposit Cash/ });
    act(() => { fireEvent.click(deposit); fireEvent.click(deposit); });
    expect(command('deposit')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Withdraw Cash/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Eject Card/ })).toBeDisabled();
    expect(screen.getByLabelText('Amount (₹)')).toBeDisabled(); expect(screen.getByLabelText('Dispense strategy')).toBeDisabled();
    await act(async () => request.resolve({ result: { ...withdrawal, type: 'DEPOSIT' }, snapshot: { ...server, revision: 3 } }));
    expect(deposit).toBeEnabled(); expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)).command).toBeNull();
  });

  it('pins the inserted card, labels the PIN form, focuses the ready input and serializes authentication', async () => {
    open(); await insert();
    expect(screen.getByRole('button', { name: /Jane Smith/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Insert Selected Card/ })).toBeDisabled();
    const pin = screen.getByLabelText('4-digit PIN'); expect(pin).toHaveFocus();
    const request = deferred(); api.sendTerminalCommand.mockReturnValueOnce(request.promise);
    fireEvent.change(pin, { target: { value: '1234' } });
    const form = screen.getByRole('form', { name: 'Authenticate inserted card' });
    act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    expect(command('authenticate')).toHaveLength(1); expect(pin).toBeDisabled();
    expect(sessionStorage.getItem(STORAGE_KEY)).not.toContain('"pin"');
    await act(async () => request.resolve({ result: account, snapshot: { ...server, state: 'AUTHENTICATED', account, revision: 2 } }));
    expect(screen.getByLabelText('Amount (₹)')).toHaveFocus();
  });

  it('refreshes a rejected PIN revision before retry, preserves its draft and uses a new request key', async () => {
    open(); await insert(); const read = deferred();
    api.getTerminalState.mockReturnValueOnce(read.promise);
    api.sendTerminalCommand.mockRejectedValueOnce(new ApiError(401, 'Wrong PIN', { code: 'AuthenticationFailedException' }));
    fireEvent.change(screen.getByLabelText('4-digit PIN'), { target: { value: '1111' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Authenticate inserted card' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong PIN');
    expect(screen.getByLabelText('4-digit PIN')).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: 'Authenticate inserted card' })); expect(command('authenticate')).toHaveLength(1);
    server = { ...server, revision: 2, pinAttemptsRemaining: 2 }; await act(async () => read.resolve(server));
    expect(screen.getByLabelText('4-digit PIN')).toHaveValue('1111');
    expect(screen.getByText('PIN attempts remaining: 2')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('4-digit PIN'), { target: { value: '1234' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Authenticate inserted card' })); await screen.findByLabelText('Amount (₹)');
    const calls = command('authenticate');
    expect(calls[0][2].expectedRevision).toBe(1); expect(calls[1][2].expectedRevision).toBe(2);
    expect(calls[0][1]).not.toBe(calls[1][1]); expect(calls[0][0]).toBe(calls[1][0]);
  });

  it('takes card blocking from the refreshed phase and retains a failed ejection until confirmed', async () => {
    open(); await insert();
    api.sendTerminalCommand.mockRejectedValueOnce(new ApiError(403, 'Too many attempts', { code: 'CardBlockedException' }));
    server = { ...server, state: 'CARD_BLOCKED', revision: 2, pinAttemptsRemaining: 0 };
    fireEvent.submit(screen.getByRole('form', { name: 'Authenticate inserted card' })); await screen.findByRole('heading', { name: /CARD BLOCKED/ });
    api.sendTerminalCommand.mockRejectedValueOnce(new ApiError(400, 'Cannot eject now'));
    click(/Eject Card/); await screen.findByText(/Cannot eject now/);
    await waitFor(() => expect(screen.getByRole('button', { name: /Eject Card/ })).toBeEnabled());
    expect(screen.getByRole('heading', { name: /CARD BLOCKED/ })).toBeInTheDocument();
    click(/Eject Card/); await ready(); expect(screen.getByRole('button', { name: /Insert Selected Card/ })).toHaveFocus();
  });

  it('retains the entire confirmed snapshot on refresh failure, coalesces reads and keeps retry focus', async () => {
    open(); await login(); const read = deferred(); api.getTerminalState.mockReturnValueOnce(read.promise);
    const refresh = screen.getByRole('button', { name: /Refresh Balance/ }); refresh.focus();
    const count = api.getTerminalState.mock.calls.length;
    act(() => { fireEvent.click(refresh); fireEvent.click(refresh); click('Refresh inventory'); });
    expect(api.getTerminalState).toHaveBeenCalledTimes(count + 1);
    await act(async () => read.reject(new ApiError(503, 'Read failed')));
    expect(screen.getByText('₹10000.00')).toBeInTheDocument(); expect(screen.getByText('₹50,000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Deposit Cash/ })).toBeDisabled();
    const retry = screen.getByRole('button', { name: 'Retry balance' }); expect(retry).toBe(refresh); expect(retry).toHaveFocus();
    server = { ...server, account: { ...account, balance: 9500 }, transactions: [withdrawal], dispenser: { ...inventory, totalCash: 49500 } };
    click('Retry balance'); await screen.findByText('₹9500.00'); expect(screen.getByText('₹49,500')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Recent transactions' })).getByText('WITHDRAWAL')).toBeInTheDocument(); expect(refresh).toHaveFocus();
  });

  it('retains a rejected amount, strategy and prior receipt while showing server-recorded failed history', async () => {
    open(); await login(); click(/Withdraw Cash/); await screen.findByText('Txn ID: TXN-1001');
    fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '99' } });
    fireEvent.change(screen.getByLabelText('Dispense strategy'), { target: { value: 'CONSERVE_LARGE_NOTES' } });
    api.sendTerminalCommand.mockRejectedValueOnce(new ApiError(400, 'Amount must be a multiple of 100'));
    server = { ...server, revision: 4, transactions: [...server.transactions, { ...withdrawal, transactionId: 'TXN-FAIL', amount: 99, status: 'FAILED' }] };
    fireEvent.submit(screen.getByRole('form', { name: 'ATM transaction' })); await screen.findByText('FAILED');
    expect(screen.getByLabelText('Amount (₹)')).toHaveValue(99); expect(screen.getByLabelText('Dispense strategy')).toHaveValue('CONSERVE_LARGE_NOTES');
    expect(screen.getByText('Txn ID: TXN-1001')).toBeInTheDocument();
    expect(command('withdraw')[1][2].payload).toEqual({ accountNumber: account.accountNumber, amount: 99, mode: 'CONSERVE_LARGE_NOTES' });
  });

  it('settles a lost committed money response using only the read-only outcome and focuses its receipt once', async () => {
    open(); await login(); api.sendTerminalCommand.mockRejectedValueOnce(new ApiError(0, 'Connection lost'));
    api.getTerminalRequest.mockResolvedValueOnce({ status: 'FOUND', outcome: { httpStatus: 200, result: withdrawal },
      snapshot: { ...server, revision: 3, account: { ...account, balance: 9500 }, transactions: [withdrawal] } });
    click(/Withdraw Cash/); await screen.findByText('Txn ID: TXN-1001');
    expect(command('withdraw')).toHaveLength(1); expect(api.getTerminalRequest).toHaveBeenCalledTimes(1);
    const call = command('withdraw')[0]; expect(api.getTerminalRequest.mock.lastCall.slice(0, 2)).toEqual(call.slice(0, 2));
    expect(screen.getByRole('heading', { name: /Transaction Receipt/ })).toHaveFocus(); expect(screen.getByLabelText('Amount (₹)')).toBeEnabled();
    click('Refresh terminal state'); await waitFor(() => expect(api.getTerminalState).toHaveBeenCalledTimes(2)); expect(command('withdraw')).toHaveLength(1);
  });

  it('keeps NOT_FOUND uncertain and retries only the original immutable amount, revision, boot and key', async () => {
    open(); await login(); fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '700' } });
    api.sendTerminalCommand.mockRejectedValueOnce(new ApiError(0, 'Connection lost'));
    click(/Deposit Cash/); await screen.findByRole('button', { name: 'Retry same request' });
    expect(screen.getByRole('alert')).toHaveTextContent(/original request could still arrive/); expect(screen.getByRole('alert')).toHaveFocus();
    expect(screen.getByRole('button', { name: /Deposit Cash/ })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '900' } });
    click('Check request outcome'); await waitFor(() => expect(api.getTerminalRequest).toHaveBeenCalledTimes(2)); expect(command('deposit')).toHaveLength(1);
    click('Retry same request'); await screen.findByText(/Successfully deposited ₹700/);
    const calls = command('deposit'); expect(calls).toHaveLength(2); expect(calls[1].slice(0, 3)).toEqual(calls[0].slice(0, 3)); expect(calls[1][2].payload.amount).toBe(700);
  });

  it('does not treat a stale replay rejection as proof that the original financial request failed', async () => {
    open(); await login(); api.sendTerminalCommand.mockRejectedValueOnce(new ApiError(0, 'Lost response'));
    click(/Withdraw Cash/); await screen.findByRole('button', { name: 'Retry same request' }); server = { ...server, revision: 9, bootId: 'boot-2' };
    api.sendTerminalCommand.mockRejectedValueOnce(new ApiError(409, 'Stale request'));
    click('Retry same request'); await waitFor(() => expect(api.getTerminalRequest).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: /Withdraw Cash/ })).toBeDisabled();
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)).command.body.expectedRevision).toBe(2); expect(command('withdraw')[1][2].bootId).toBe('boot-1');
  });

  it('settles a recovered 4xx rejection once and retains the draft', async () => {
    open(); await login(); api.sendTerminalCommand.mockRejectedValueOnce(new ApiError(0, 'Lost response'));
    api.getTerminalRequest.mockResolvedValueOnce({ status: 'FOUND', outcome: { httpStatus: 400, error: 'Insufficient cash', code: 'InsufficientCashException' }, snapshot: { ...server, revision: 3 } });
    click(/Withdraw Cash/); await screen.findByText(/Withdrawal rejected: Insufficient cash/);
    expect(screen.getByLabelText('Amount (₹)')).toBeEnabled(); expect(screen.getByLabelText('Amount (₹)')).toHaveValue(500);
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)).command).toBeNull(); expect(command('withdraw')).toHaveLength(1);
  });

  it('keeps a cached 500 unknown, never offers a fresh money retry, and allows owned ejection', async () => {
    open(); await login(); api.sendTerminalCommand.mockRejectedValueOnce(new ApiError(500, 'Server failure'));
    api.getTerminalRequest.mockResolvedValue({ status: 'FOUND', outcome: { httpStatus: 500, error: 'Server failure' }, snapshot: server });
    click(/Deposit Cash/); await screen.findByText(/no definitive successful or rejected outcome/);
    expect(screen.queryByRole('button', { name: 'Retry same request' })).not.toBeInTheDocument(); expect(screen.getByRole('button', { name: /Deposit Cash/ })).toBeDisabled();
    click('Refresh terminal state'); await waitFor(() => expect(api.getTerminalRequest).toHaveBeenCalledTimes(2)); expect(command('deposit')).toHaveLength(1);
    click(/Eject Card/); await ready(); expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)).command).toBeNull();
  });

  it('aborts interrupted deposits on tab departure, ignores late success and only reads outcomes on return', async () => {
    const request = deferred(); open(); await login(); api.sendTerminalCommand.mockReturnValueOnce(request.promise);
    click(/Deposit Cash/); const call = command('deposit')[0];
    fireEvent.click(screen.getByRole('tab', { name: /Interactive 2D Simulation/ })); expect(call[3].signal.aborted).toBe(true);
    await act(async () => request.resolve({ result: { ...withdrawal, type: 'DEPOSIT' }, snapshot: server }));
    fireEvent.click(screen.getByRole('tab', { name: 'App', exact: true })); await screen.findByRole('button', { name: 'Retry same request' });
    expect(command('deposit')).toHaveLength(1); expect(api.getTerminalRequest).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Successfully deposited/)).not.toBeInTheDocument(); expect(screen.getByRole('button', { name: /Deposit Cash/ })).toBeDisabled();
  });

  it('restores the tab token and original financial request after route unmount/reload without persisting a PIN', async () => {
    const request = deferred(); const view = open(); await login(); api.sendTerminalCommand.mockReturnValueOnce(request.promise);
    click(/Withdraw Cash/); const call = command('withdraw')[0]; const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    expect(saved.token).toBe(call[0]); expect(saved.command.requestId).toBe(call[1]); expect(saved.command.body.payload).not.toHaveProperty('pin');
    expect(Object.keys(saved)).toEqual(['token', 'command']); view.unmount(); expect(call[3].signal.aborted).toBe(true);
    api.getTerminalRequest.mockResolvedValueOnce({ status: 'FOUND', outcome: { httpStatus: 200, result: withdrawal }, snapshot: { ...server, revision: 3 } });
    open(); await screen.findByText('Txn ID: TXN-1001'); expect(api.getTerminalRequest.mock.lastCall.slice(0, 2)).toEqual(call.slice(0, 2)); expect(command('withdraw')).toHaveLength(1);
    await act(async () => request.resolve({ result: { ...withdrawal, transactionId: 'LATE' }, snapshot: server })); expect(screen.queryByText('Txn ID: LATE')).not.toBeInTheDocument();
  });

  it('re-reads the phase for a lost authentication response without replaying or retaining the PIN on return', async () => {
    const request = deferred(); open(); await insert(); api.sendTerminalCommand.mockReturnValueOnce(request.promise);
    fireEvent.change(screen.getByLabelText('4-digit PIN'), { target: { value: '1234' } }); fireEvent.submit(screen.getByRole('form', { name: 'Authenticate inserted card' }));
    const call = command('authenticate')[0]; fireEvent.click(screen.getByRole('tab', { name: /Interactive 2D Simulation/ }));
    expect(call[3].signal.aborted).toBe(true); expect(sessionStorage.getItem(STORAGE_KEY)).not.toContain('"pin"');
    server = { ...server, revision: 2, state: 'AUTHENTICATED', account }; fireEvent.click(screen.getByRole('tab', { name: 'App', exact: true })); await screen.findByLabelText('Amount (₹)');
    expect(command('authenticate')).toHaveLength(1); expect(api.getTerminalRequest).not.toHaveBeenCalled();
  });

  it('aborts departed reads and prevents pre-mutation and late departed responses overwriting confirmed state', async () => {
    open(); await login(); const old = deferred(); api.getTerminalState.mockReturnValueOnce(old.promise);
    click(/Refresh Balance/); const signal = api.getTerminalState.mock.lastCall[1].signal;
    click(/Deposit Cash/); await screen.findByText('₹10500.00'); expect(signal.aborted).toBe(true);
    await act(async () => old.resolve({ ...server, account: { ...account, balance: 123 } })); expect(screen.queryByText('₹123.00')).not.toBeInTheDocument();
    const departed = deferred(); api.getTerminalState.mockReturnValueOnce(departed.promise);
    click('Refresh inventory'); const departedSignal = api.getTerminalState.mock.lastCall[1].signal;
    fireEvent.click(screen.getByRole('tab', { name: /Interactive 2D Simulation/ })); expect(departedSignal.aborted).toBe(true);
    await act(async () => departed.resolve({ ...server, dispenser: { ...inventory, totalCash: 999 } }));
    fireEvent.click(screen.getByRole('tab', { name: 'App', exact: true })); await screen.findByText('₹10500.00'); expect(screen.queryByText('₹999')).not.toBeInTheDocument();
  });

  it('clears private account/history/receipt when the lease expires or ownership changes', async () => {
    open(); await login(); click(/Withdraw Cash/); await screen.findByText('Txn ID: TXN-1001');
    server = snapshot({ revision: 4, state: 'BUSY' }); click('Refresh terminal state'); await screen.findByText('Terminal in use by another session');
    expect(screen.queryByText(account.accountNumber)).not.toBeInTheDocument(); expect(screen.queryByRole('region', { name: 'Last confirmed transaction receipt' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Recent transactions' })).not.toBeInTheDocument();
  });

  it('warns visibly on storage failure and does not send money without a saved recovery record', async () => {
    open(); await login(); vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => { throw new Error('Storage denied'); });
    click(/Deposit Cash/); await screen.findByText(/Transaction was not sent/); expect(screen.getAllByRole('alert').map(node => node.textContent).join(' ')).toMatch(/not sent.*recovery details could not be saved/);
    expect(command('deposit')).toHaveLength(0); expect(screen.getByRole('button', { name: /Eject Card/ })).toBeEnabled();
  });

  it('bounds displayed history while retaining server order and labels the truncated display', async () => {
    open(); await login(); server = { ...server, transactions: Array.from({ length: 100 }, (_, index) => ({ ...withdrawal, transactionId: `TXN-${index}`, amount: index })) };
    click('Refresh transactions'); await screen.findByText(/Showing the latest 8 transactions/);
    const history = screen.getByRole('region', { name: 'Recent transactions' }); expect(history.querySelectorAll('.txn-row')).toHaveLength(8); expect(history.querySelector('.txn-row')).toHaveTextContent('₹99');
  });
});

describe('ATM recovery and browser failure boundaries', () => {
  it('retains unknown recovery metadata through a failed outcome read and never sends a new mutation on read retry', async () => {
    open(); await login(); api.sendTerminalCommand.mockRejectedValueOnce(new ApiError(0, 'Lost response'));
    api.getTerminalRequest.mockRejectedValueOnce(new ApiError(503, 'Outcome read unavailable'));
    click(/Deposit Cash/); await screen.findByText(/Outcome read unavailable/);
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY)).command;
    expect(screen.getByRole('button', { name: /Deposit Cash/ })).toBeDisabled();
    expect(screen.getByText('₹10000.00')).toBeInTheDocument();
    click('Retry terminal state'); await screen.findByRole('button', { name: 'Retry same request' });
    expect(command('deposit')).toHaveLength(1); expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)).command).toEqual(saved);
    expect(api.getTerminalRequest.mock.lastCall[1]).toBe(saved.requestId);
  });

  it('requires a successful state read after a definitive rejected command before admitting a new key', async () => {
    open(); await login(); api.sendTerminalCommand.mockRejectedValueOnce(new ApiError(400, 'Insufficient cash'));
    api.getTerminalState.mockRejectedValueOnce(new ApiError(503, 'State unavailable'));
    click(/Withdraw Cash/); await screen.findByText(/State unavailable/);
    fireEvent.submit(screen.getByRole('form', { name: 'ATM transaction' })); expect(command('withdraw')).toHaveLength(1);
    server = { ...server, revision: 3 }; click('Retry terminal state');
    await waitFor(() => expect(screen.getByRole('button', { name: /Withdraw Cash/ })).toBeEnabled());
    click(/Withdraw Cash/); await screen.findByText('Txn ID: TXN-1001');
    expect(command('withdraw')[1][2].expectedRevision).toBe(3);
    expect(command('withdraw')[1][1]).not.toBe(command('withdraw')[0][1]);
  });

  it('recovers a lost insertion response by reading the owned phase without submitting another insert', async () => {
    open(); await ready();
    api.sendTerminalCommand.mockImplementationOnce(async () => {
      server = { ...server, state: 'CARD_INSERTED', owned: true, cardNumber: '1111222233334444', revision: 1, pinAttemptsRemaining: 3 };
      throw new ApiError(0, 'Lost insertion response');
    });
    click(/Insert Selected Card/); const pin = await screen.findByLabelText('4-digit PIN');
    await waitFor(() => expect(pin).toBeEnabled()); expect(pin).toHaveFocus();
    expect(command('insert')).toHaveLength(1); expect(api.getTerminalRequest).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Insert Selected Card/ })).toBeDisabled();
  });

  it('keeps the financial warning after rejected recovery ejection and clears it only on confirmed ejection', async () => {
    open(); await login(); api.sendTerminalCommand.mockRejectedValueOnce(new ApiError(0, 'Lost deposit response'));
    click(/Deposit Cash/); await screen.findByRole('button', { name: 'Retry same request' });
    api.sendTerminalCommand.mockRejectedValueOnce(new ApiError(400, 'Cannot eject now'));
    click(/Eject Card/); await waitFor(() => expect(api.getTerminalRequest).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('alert')).toHaveTextContent(/deposit outcome is unknown/);
    expect(screen.getByRole('button', { name: /Deposit Cash/ })).toBeDisabled();
    click(/Eject Card/); await ready(); expect(command('deposit')).toHaveLength(1);
    expect(screen.queryByRole('region', { name: 'Transaction recovery' })).not.toBeInTheDocument();
  });

  it('retains unresolved NOT_FOUND recovery when the terminal has expired and is now unowned', async () => {
    open(); await login(); api.sendTerminalCommand.mockRejectedValueOnce(new ApiError(0, 'Lost response'));
    api.getTerminalRequest.mockResolvedValueOnce({ status: 'NOT_FOUND', outcome: null, snapshot: snapshot({ revision: 4, bootId: 'new-boot' }) });
    click(/Withdraw Cash/); await screen.findByRole('button', { name: 'Retry same request' });
    expect(screen.getByRole('button', { name: /Insert Selected Card/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Eject Card/ })).toBeDisabled();
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)).command.body.bootId).toBe('boot-1');
    click('Check request outcome'); await waitFor(() => expect(api.getTerminalRequest).toHaveBeenCalledTimes(2));
    expect(command('withdraw')).toHaveLength(1);
  });

  it('survives unavailable storage during activation and shows a useful warning', async () => {
    vi.spyOn(sessionStorage, 'getItem').mockImplementation(() => { throw new Error('Read denied'); });
    vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => { throw new Error('Write denied'); });
    open(); await ready();
    expect(screen.getByRole('alert')).toHaveTextContent(/session storage is unavailable.*Keep this tab open/);
    expect(api.getTerminalState.mock.lastCall[0]).toMatch(/^[a-f0-9-]{36}$/i);
  });

  it('uses secure getRandomValues UUID fallback when randomUUID is unavailable', async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'invalid-token' }));
    const getRandomValues = vi.fn(globalThis.crypto.getRandomValues.bind(globalThis.crypto));
    vi.stubGlobal('crypto', { getRandomValues });
    open(); await insert();
    const [token, requestId] = command('insert')[0];
    const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
    expect(token).toMatch(uuid); expect(requestId).toMatch(uuid); expect(requestId).not.toBe(token);
    expect(getRandomValues).toHaveBeenCalledTimes(2);
  });
});

describe('explicitly ending unowned financial recovery', () => {
  it.each(['NOT_FOUND', 'FAILED'])('requires fresh unowned %s state and explicit confirmation, retaining the token, drafts and unrelated storage', async status => {
    open(); await login();
    fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '700' } });
    fireEvent.change(screen.getByLabelText('Dispense strategy'), { target: { value: 'CONSERVE_LARGE_NOTES' } });
    localStorage.setItem('lld-module-progress', 'keep-progress');
    sessionStorage.setItem('unrelated-notes', 'keep-notes');
    const read = deferred();
    api.sendTerminalCommand.mockRejectedValueOnce(new ApiError(0, 'Lost response'));
    api.getTerminalRequest.mockReturnValueOnce(read.promise);
    click(/Withdraw Cash/); await screen.findByText(/withdrawal outcome is unknown/);
    expect(screen.queryByRole('button', { name: 'End unresolved recovery' })).not.toBeInTheDocument();
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    const fresh = snapshot({ revision: 4, bootId: 'new-boot' });
    await act(async () => read.resolve({ status: status === 'NOT_FOUND' ? 'NOT_FOUND' : 'FOUND',
      outcome: status === 'FAILED' ? { httpStatus: 500, error: 'Unresolved failure' } : null, snapshot: fresh }));
    expect(screen.getByRole('button', { name: /Insert Selected Card/ })).toBeDisabled();
    const count = api.sendTerminalCommand.mock.calls.length;
    click('End unresolved recovery');
    const confirmation = screen.getByRole('group', { name: 'End local recovery?' });
    expect(confirmation).toHaveAccessibleDescription(/may have completed.*does not reverse it.*after signing in again/);
    expect(screen.getByRole('button', { name: 'Keep recovery' })).toHaveFocus();
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY))).toEqual(saved);
    expect(confirmation).not.toHaveTextContent(saved.token);
    expect(confirmation).not.toHaveTextContent('accountNumber');
    click('Confirm end recovery');
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY))).toEqual({ token: saved.token, command: null });
    expect(localStorage.getItem('lld-module-progress')).toBe('keep-progress');
    expect(sessionStorage.getItem('unrelated-notes')).toBe('keep-notes');
    expect(api.sendTerminalCommand).toHaveBeenCalledTimes(count);
    expect(screen.getByText(/Local recovery ended.*transaction may have completed/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Insert Selected Card/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Insert Selected Card/ })).toHaveFocus();
    expect(screen.getByText('₹50,000')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Transaction recovery' })).not.toBeInTheDocument();
    server = fresh;
    click(/Insert Selected Card/); await screen.findByLabelText('4-digit PIN');
    fireEvent.change(screen.getByLabelText('4-digit PIN'), { target: { value: '1234' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Authenticate inserted card' }));
    await screen.findByLabelText('Amount (₹)');
    expect(screen.getByLabelText('Amount (₹)')).toHaveValue(700);
    expect(screen.getByLabelText('Dispense strategy')).toHaveValue('CONSERVE_LARGE_NOTES');
    expect(command('withdraw')).toHaveLength(1);
  });

  it('keeps unresolved metadata and blocking on cancellation, returning focus to the stable action', async () => {
    open(); await login(); api.sendTerminalCommand.mockRejectedValueOnce(new ApiError(0, 'Lost response'));
    api.getTerminalRequest.mockResolvedValueOnce({ status: 'NOT_FOUND', outcome: null, snapshot: snapshot({ revision: 4 }) });
    click(/Deposit Cash/); await screen.findByRole('button', { name: 'End unresolved recovery' });
    const saved = sessionStorage.getItem(STORAGE_KEY);
    const count = api.sendTerminalCommand.mock.calls.length;
    click('End unresolved recovery'); click('Keep recovery');
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe(saved);
    expect(screen.getByRole('button', { name: 'End unresolved recovery' })).toHaveFocus();
    expect(screen.getByRole('button', { name: /Insert Selected Card/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Confirm end recovery' })).not.toBeInTheDocument();
    expect(api.sendTerminalCommand).toHaveBeenCalledTimes(count);
  });

  it('can end local recovery while BUSY without allowing foreign insertion/ejection and focuses Refresh', async () => {
    open(); await login(); api.sendTerminalCommand.mockRejectedValueOnce(new ApiError(500, 'Failed response'));
    api.getTerminalRequest.mockResolvedValueOnce({ status: 'FOUND', outcome: { httpStatus: 500, error: 'Unknown result' },
      snapshot: snapshot({ state: 'BUSY', revision: 4, expiresAt: Date.now() + 600000 }) });
    click(/Withdraw Cash/); await screen.findByRole('button', { name: 'End unresolved recovery' });
    const count = api.sendTerminalCommand.mock.calls.length;
    click('End unresolved recovery'); click('Confirm end recovery');
    expect(screen.getByText('Terminal in use by another session')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Insert Selected Card/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Eject Card/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Refresh terminal state' })).toHaveFocus();
    expect(api.sendTerminalCommand).toHaveBeenCalledTimes(count);
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)).command).toBeNull();
    server = snapshot({ revision: 5 }); click('Refresh terminal state'); await ready();
    expect(command('withdraw')).toHaveLength(1);
  });

  it('does not offer ending recovery while owned or while a failed refresh leaves only stale unowned state', async () => {
    open(); await login(); api.sendTerminalCommand.mockRejectedValueOnce(new ApiError(0, 'Lost response'));
    click(/Deposit Cash/); await screen.findByRole('button', { name: 'Retry same request' });
    expect(screen.queryByRole('button', { name: 'End unresolved recovery' })).not.toBeInTheDocument();
    api.getTerminalRequest.mockResolvedValueOnce({ status: 'NOT_FOUND', outcome: null, snapshot: snapshot({ revision: 4 }) });
    click('Check request outcome'); await screen.findByRole('button', { name: 'End unresolved recovery' });
    api.getTerminalRequest.mockRejectedValueOnce(new ApiError(503, 'Refresh unavailable'));
    click('Check request outcome'); await screen.findByText(/Refresh unavailable/);
    expect(screen.queryByRole('button', { name: 'End unresolved recovery' })).not.toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)).command).not.toBeNull();
  });

  it('retains the financial record if clearing storage fails during confirmation', async () => {
    open(); await login(); api.sendTerminalCommand.mockRejectedValueOnce(new ApiError(0, 'Lost response'));
    api.getTerminalRequest.mockResolvedValueOnce({ status: 'NOT_FOUND', outcome: null, snapshot: snapshot({ revision: 4 }) });
    click(/Deposit Cash/); await screen.findByRole('button', { name: 'End unresolved recovery' });
    const saved = sessionStorage.getItem(STORAGE_KEY); const count = api.sendTerminalCommand.mock.calls.length;
    click('End unresolved recovery');
    vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => { throw new Error('Storage denied'); });
    click('Confirm end recovery');
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe(saved);
    expect(screen.getByRole('group', { name: 'End local recovery?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Insert Selected Card/ })).toBeDisabled();
    expect(api.sendTerminalCommand).toHaveBeenCalledTimes(count);
  });
});
