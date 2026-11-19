import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../utils/api';
import * as api from '../lld/atm/api';

vi.mock('../utils/api', () => ({ apiFetch: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

describe('ATM live API cancellation and Java request contracts', () => {
  it.each([
    ['insertCard', ['1111222233334444'], '/atm/insert-card', { cardNumber: '1111222233334444' }],
    ['authenticate', ['1111222233334444', '1234'], '/atm/authenticate', { cardNumber: '1111222233334444', pin: '1234' }],
    ['withdraw', ['1234567890', '500', 'CONSERVE_LARGE_NOTES'], '/atm/1234567890/withdraw', { amount: 500, mode: 'CONSERVE_LARGE_NOTES' }],
    ['deposit', ['1234567890', '500'], '/atm/1234567890/deposit', { amount: 500 }],
    ['ejectCard', [], '/atm/eject', null],
    ['getBalance', ['1234567890'], '/atm/1234567890/balance', undefined],
    ['getTransactions', ['1234567890'], '/atm/1234567890/transactions', undefined],
    ['getDispenserStatus', [], '/atm/dispenser', undefined],
  ])('%s forwards cancellation while keeping the real endpoint and request payload', async (name, args, path, body) => {
    const controller = new AbortController();
    const result = { confirmed: true };
    apiFetch.mockResolvedValueOnce(result);
    expect(await api[name](...args, { signal: controller.signal })).toBe(result);
    const [url, options] = apiFetch.mock.lastCall;
    expect(url).toBe(path);
    expect(options.signal).toBe(controller.signal);
    if (body === undefined) {
      expect(options.method).toBeUndefined();
      expect(options.body).toBeUndefined();
    } else {
      expect(options.method).toBe('POST');
      expect(options.body === undefined ? null : JSON.parse(options.body)).toEqual(body);
    }
  });
});

describe('coordinated ATM terminal API', () => {
  it('reads state with the tab token and cancellation', async () => {
    const controller = new AbortController();
    await api.getTerminalState('tab-token', { signal: controller.signal });
    expect(apiFetch).toHaveBeenCalledWith('/atm/terminal/state', {
      signal: controller.signal, headers: { 'X-ATM-Session': 'tab-token' },
    });
  });
  it('sends and replays the exact command with its original key, revision, payload and content type', async () => {
    const controller = new AbortController();
    const body = { operation: 'withdraw', expectedRevision: 8, bootId: 'boot-a', payload: { accountNumber: 'A1', amount: 700, mode: 'MINIMIZE_NOTES' } };
    await api.sendTerminalCommand('tab-token', 'request-key', body, { signal: controller.signal });
    await api.sendTerminalCommand('tab-token', 'request-key', body, { signal: controller.signal });
    expect(apiFetch.mock.calls[0]).toEqual(apiFetch.mock.calls[1]);
    expect(apiFetch).toHaveBeenLastCalledWith('/atm/terminal/commands', {
      signal: controller.signal, method: 'POST', body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', 'X-ATM-Session': 'tab-token', 'Idempotency-Key': 'request-key' },
    });
  });
  it('recovers an outcome using GET, with no mutation body or idempotency key', async () => {
    const controller = new AbortController();
    await api.getTerminalRequest('tab-token', 'request-key', { signal: controller.signal });
    expect(apiFetch).toHaveBeenCalledWith('/atm/terminal/requests/request-key', {
      signal: controller.signal, headers: { 'X-ATM-Session': 'tab-token' },
    });
  });
});
