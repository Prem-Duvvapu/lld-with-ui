import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock('../utils/api', () => ({ apiFetch: mocks.apiFetch }));

import {
  getStatus, transition, emergency,
  simReset, simTick, simEmergency, simResume, simManualTransition,
  simGetEvents, simGetSnapshot,
} from '../lld/traffic-signal/api';

beforeEach(() => {
  mocks.apiFetch.mockReset();
  mocks.apiFetch.mockResolvedValue({ intersection: { lights: [] }, events: [] });
});

describe('Traffic Signal API namespace isolation', () => {
  it('keeps operational helpers on live endpoints', async () => {
    await getStatus();
    await transition();
    await emergency(2);

    expect(mocks.apiFetch).toHaveBeenNthCalledWith(1, '/traffic/status');
    expect(mocks.apiFetch).toHaveBeenNthCalledWith(2, '/traffic/transition', { method: 'POST' });
    expect(mocks.apiFetch).toHaveBeenNthCalledWith(3, '/traffic/emergency?lightId=2', { method: 'POST' });
  });

  it('routes every simulation mutation and read exclusively through /sim/*', async () => {
    await simReset();
    await simTick(8, 2);
    await simEmergency(3, 5);
    await simResume(7);
    await simManualTransition(1, 'GREEN', 4);
    await simGetEvents();
    await simGetSnapshot();

    expect(mocks.apiFetch).toHaveBeenNthCalledWith(1, '/traffic/sim/reset', { method: 'POST' });
    expect(mocks.apiFetch).toHaveBeenNthCalledWith(2, '/traffic/sim/tick', {
      method: 'POST', body: JSON.stringify({ seconds: 8, step: 2 }),
    });
    expect(mocks.apiFetch).toHaveBeenNthCalledWith(3, '/traffic/sim/emergency', {
      method: 'POST', body: JSON.stringify({ lightId: 3, step: 5 }),
    });
    expect(mocks.apiFetch).toHaveBeenNthCalledWith(4, '/traffic/sim/resume', {
      method: 'POST', body: JSON.stringify({ step: 7 }),
    });
    expect(mocks.apiFetch).toHaveBeenNthCalledWith(5, '/traffic/sim/manual-transition', {
      method: 'POST', body: JSON.stringify({ lightId: 1, target: 'GREEN', step: 4 }),
    });
    expect(mocks.apiFetch).toHaveBeenNthCalledWith(6, '/traffic/sim/events');
    expect(mocks.apiFetch).toHaveBeenNthCalledWith(7, '/traffic/sim/snapshot');

    for (const [path] of mocks.apiFetch.mock.calls) {
      expect(path).toMatch(/^\/traffic\/sim\//);
    }
  });
});
