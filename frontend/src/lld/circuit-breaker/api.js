import { apiFetch } from '../../utils/api';

export const listServices = () => apiFetch('/circuitbreaker/services');
export const getState = (serviceName) => apiFetch(`/circuitbreaker/${serviceName}/state`);
export const callService = (serviceName, simulateSuccess) =>
  apiFetch(`/circuitbreaker/${serviceName}/call`, {
    method: 'POST',
    body: JSON.stringify({ simulateSuccess }),
  });
export const resetService = (serviceName) =>
  apiFetch(`/circuitbreaker/${serviceName}/reset`, { method: 'POST' });

export const simReset = () => apiFetch('/circuitbreaker/sim/reset', { method: 'POST' });
export const simCall = (simulateSuccess, step) =>
  apiFetch('/circuitbreaker/sim/call', {
    method: 'POST',
    body: JSON.stringify({ simulateSuccess, step }),
  });
export const simAdvanceClock = (millis, step) =>
  apiFetch('/circuitbreaker/sim/advance-clock', {
    method: 'POST',
    body: JSON.stringify({ millis, step }),
  });
export const simGetEvents = () => apiFetch('/circuitbreaker/sim/events');
export const simGetSnapshot = () => apiFetch('/circuitbreaker/sim/snapshot');
