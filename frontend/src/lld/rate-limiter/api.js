import { apiFetch } from '../../utils/api';

const BASE = '/api/ratelimiter';

export const attemptRequest = (clientId) => apiFetch(`${BASE}/clients/${clientId}/request`, { method: 'POST' });
export const getStatus = (clientId) => apiFetch(`${BASE}/clients/${clientId}/status`);
export const listClients = () => apiFetch(`${BASE}/clients`);
export const configureClient = (clientId, config) =>
  apiFetch(`${BASE}/clients/${clientId}/config`, { method: 'PUT', body: JSON.stringify(config) });

export const simReset = () => apiFetch(`${BASE}/sim/reset`, { method: 'POST' });
export const simSendRequest = (step) =>
  apiFetch(`${BASE}/sim/request`, { method: 'POST', body: JSON.stringify({ step }) });
export const simAdvanceClock = (seconds, step) =>
  apiFetch(`${BASE}/sim/advance`, { method: 'POST', body: JSON.stringify({ seconds, step }) });
export const simGetEvents = () => apiFetch(`${BASE}/sim/events`);
export const simGetSnapshot = () => apiFetch(`${BASE}/sim/snapshot`);
