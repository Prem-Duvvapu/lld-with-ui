import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => { mockFetch.mockReset(); });

const BASE = 'http://localhost:9090/api/parking';

async function getGates() {
  const res = await fetch(`${BASE}/gates`);
  return res.json();
}

async function vehicleEntry(gateId, vehicleNumber, vehicleType) {
  const res = await fetch(`${BASE}/entry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gateId, vehicleNumber, vehicleType }),
  });
  return res.json();
}

async function vehicleExit(gateId, ticketNumber) {
  const res = await fetch(`${BASE}/exit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gateId, ticketNumber }),
  });
  return res.json();
}

async function getFloors() {
  const res = await fetch(`${BASE}/floors`);
  return res.json();
}

async function getActiveTickets() {
  const res = await fetch(`${BASE}/tickets/active`);
  return res.json();
}

describe('Parking API', () => {
  it('getGates calls correct URL', async () => {
    const gates = [{ id: 'G1', name: 'Main Entry', type: 'ENTRY' }];
    mockFetch.mockResolvedValue({ json: async () => gates });

    const result = await getGates();
    expect(mockFetch).toHaveBeenCalledWith(`${BASE}/gates`);
    expect(result).toEqual(gates);
  });

  it('vehicleEntry sends POST with correct body', async () => {
    const ticket = { ticketNumber: 'TKT-00001', vehicleNumber: 'KA-01', vehicleType: 'CAR', spotId: 'F1-C1' };
    mockFetch.mockResolvedValue({ json: async () => ticket });

    const result = await vehicleEntry('G1', 'KA-01', 'CAR');
    expect(mockFetch).toHaveBeenCalledWith(`${BASE}/entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gateId: 'G1', vehicleNumber: 'KA-01', vehicleType: 'CAR' }),
    });
    expect(result).toEqual(ticket);
  });

  it('vehicleExit sends POST with correct body', async () => {
    const receipt = { ticketNumber: 'TKT-00001', amount: 20 };
    mockFetch.mockResolvedValue({ json: async () => receipt });

    const result = await vehicleExit('G3', 'TKT-00001');
    expect(mockFetch).toHaveBeenCalledWith(`${BASE}/exit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gateId: 'G3', ticketNumber: 'TKT-00001' }),
    });
    expect(result).toEqual(receipt);
  });

  it('vehicleEntry passes error responses through', async () => {
    const err = { error: 'No available spot' };
    mockFetch.mockResolvedValue({ json: async () => err });

    const result = await vehicleEntry('G1', 'KA-01', 'TRUCK');
    expect(result.error).toBe('No available spot');
  });

  it('getFloors calls correct URL', async () => {
    mockFetch.mockResolvedValue({ json: async () => [{ floorNumber: 1, spots: [] }] });
    const result = await getFloors();
    expect(mockFetch).toHaveBeenCalledWith(`${BASE}/floors`);
    expect(result[0].floorNumber).toBe(1);
  });

  it('getActiveTickets calls correct URL', async () => {
    mockFetch.mockResolvedValue({ json: async () => [] });
    const result = await getActiveTickets();
    expect(mockFetch).toHaveBeenCalledWith(`${BASE}/tickets/active`);
    expect(result).toEqual([]);
  });
});
