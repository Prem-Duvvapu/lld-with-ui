import { beforeEach, expect, it, vi } from 'vitest';
import { apiFetch } from '../utils/api';
import * as api from '../lld/logging-framework/api';

vi.mock('../utils/api', () => ({ apiFetch: vi.fn().mockResolvedValue(null) }));

beforeEach(() => vi.clearAllMocks());

it.each([
  ['simReset', [], '/logging/sim/reset', 'POST', undefined],
  ['simConfigure', ['ERROR'], '/logging/sim/configure', 'POST', { level: 'ERROR' }],
  ['simEmitLog', ['AuthService', 'WARN', 'A message', { traceId: '42' }], '/logging/sim/log', 'POST', { loggerName: 'AuthService', level: 'WARN', message: 'A message', context: { traceId: '42' } }],
  ['simGetLogs', [], '/logging/sim/logs', 'GET', undefined],
  ['simGetTelemetry', [], '/logging/sim/telemetry', 'GET', undefined],
  ['simGetAppenderLogs', ['FILE'], '/logging/sim/appenders/FILE/logs', 'GET', undefined],
])('%s stays in the sandbox namespace and forwards cancellation', async (helper, argumentsList, path, method, body) => {
  const controller = new AbortController();
  await api[helper](...argumentsList, { signal: controller.signal });
  expect(apiFetch).toHaveBeenCalledTimes(1);
  const [calledPath, options] = apiFetch.mock.calls[0];
  expect(calledPath).toBe(path);
  expect(options.signal).toBe(controller.signal);
  expect(options.method || 'GET').toBe(method);
  expect(options.body ? JSON.parse(options.body) : undefined).toEqual(body);
});
