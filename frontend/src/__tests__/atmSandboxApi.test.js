import { beforeEach, expect, it, vi } from 'vitest';
import { apiFetch } from '../utils/api';
import * as api from '../lld/atm/api';
vi.mock('../utils/api', () => ({ apiFetch: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
it.each([
  ['simReset', [], '/atm/sim/reset', 'POST'],
  ['simInsertCard', ['CARD-SIM-1'], '/atm/sim/insert-card', 'POST', {cardNumber:'CARD-SIM-1'}],
  ['simAuthenticate', ['CARD-SIM-1','1234'], '/atm/sim/authenticate', 'POST', {cardNumber:'CARD-SIM-1',pin:'1234'}],
  ['simWithdraw', ['ACC-SIM-1',600,'MINIMIZE_NOTES'], '/atm/sim/withdraw', 'POST', {accountNumber:'ACC-SIM-1',amount:600,mode:'MINIMIZE_NOTES'}],
  ['simEject', [], '/atm/sim/eject', 'POST'],
  ['simGetState', [], '/atm/sim/state'],
  ['simGetEvents', [], '/atm/sim/events'],
  ['simGetSnapshots', [], '/atm/sim/snapshots'],
])('%s forwards cancellation and the Java request contract', async (name,args,path,method,body) => {
  const controller = new AbortController(); await api[name](...args,{signal:controller.signal});
  const [url,options] = apiFetch.mock.calls[0]; expect(url).toBe(path); expect(options.signal).toBe(controller.signal);
  expect(options.method).toBe(method); expect(options.body).toBe(body?JSON.stringify(body):undefined);
});
