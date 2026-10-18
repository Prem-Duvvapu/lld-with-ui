import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as parking from '../lld/parking/api';
import { apiFetch } from '../utils/api';

vi.mock('../utils/api', () => ({ apiFetch: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

const requests = [
  ['getGates', [], '/gates'],
  ['getFloors', [], '/floors'],
  ['getActiveTickets', [], '/tickets/active'],
  ['getAvailableSpots', ['CAR'], '/spots/available?vehicleType=CAR'],
  ['vehicleEntry', ['G1', 'CAR-42', 'CAR', 'FARTHEST'], '/entry', { gateId: 'G1', vehicleNumber: 'CAR-42', vehicleType: 'CAR', strategy: 'FARTHEST' }],
  ['scanVehicleExit', ['G3', 'TKT-1', 'FLAT'], '/exit/scan', { gateId: 'G3', ticketNumber: 'TKT-1', pricingStrategy: 'FLAT' }],
  ['payVehicleExit', ['G3', 'TKT-1', 'FLAT', 'CARD'], '/exit/pay', { gateId: 'G3', ticketNumber: 'TKT-1', pricingStrategy: 'FLAT', paymentMethod: 'CARD' }],
  ['vehicleExit', ['G3', 'TKT-1'], '/exit', { gateId: 'G3', ticketNumber: 'TKT-1' }],
  ['simReset', [], '/sim/reset', null],
  ['simEntry', ['SIM-42', 'TRUCK', 'FARTHEST'], '/sim/entry', { vehicleNumber: 'SIM-42', vehicleType: 'TRUCK', strategy: 'FARTHEST' }],
  ['simScan', ['SIM-TKT-1', 'DYNAMIC'], '/sim/scan', { ticketNumber: 'SIM-TKT-1', pricingStrategy: 'DYNAMIC' }],
  ['simPay', ['SIM-TKT-1', 'DYNAMIC', 'UPI'], '/sim/pay', { ticketNumber: 'SIM-TKT-1', pricingStrategy: 'DYNAMIC', paymentMethod: 'UPI' }],
  ['simState', [], '/sim/state'],
  ['simEvents', [], '/sim/events'],
];

describe('Production parking API wrappers', () => {
  it.each(requests)('%s sends the real contract and forwards cancellation', async (name, args, suffix, body) => {
    const response = { recorded: true };
    apiFetch.mockResolvedValue(response);
    const signal = new AbortController().signal;
    await expect(parking[name](...args, { signal })).resolves.toBe(response);
    const [url, options] = apiFetch.mock.calls[0];
    expect(url).toBe(`/parking${suffix}`);
    expect(options.signal).toBe(signal);
    if (body !== undefined) expect(options.method).toBe('POST');
    else expect(options.method).toBeUndefined();
    if (body) expect(JSON.parse(options.body)).toEqual(body);
  });

  it('keeps backwards-compatible defaults and encodes filter values', async () => {
    await parking.vehicleEntry('G1', 'CAR-42', 'CAR');
    expect(JSON.parse(apiFetch.mock.calls[0][1].body).strategy).toBe('NEAREST');
    await parking.payVehicleExit('G3', 'TKT-1');
    expect(JSON.parse(apiFetch.mock.calls[1][1].body)).toEqual({ gateId: 'G3', ticketNumber: 'TKT-1', pricingStrategy: 'HOURLY', paymentMethod: 'UPI' });
    await parking.getAvailableSpots('CAR & BIKE');
    expect(apiFetch.mock.calls[2][0]).toBe('/parking/spots/available?vehicleType=CAR%20%26%20BIKE');
  });

  it('does not swallow typed failures or repeat a mutation', async () => {
    const failure = Object.assign(new Error('Already exited'), { status: 409 });
    apiFetch.mockRejectedValue(failure);
    await expect(parking.payVehicleExit('G3', 'TKT-1')).rejects.toBe(failure);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});
