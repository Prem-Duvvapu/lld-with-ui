import { apiFetch } from '../../utils/api';

const BASE = '/api/threadpool';

export const listPools = () => apiFetch(`${BASE}/pools`);
export const getStats = (poolId) => apiFetch(`${BASE}/${poolId}/stats`);
export const submitTask = (poolId, taskName, durationMillis) =>
  apiFetch(`${BASE}/${poolId}/submit`, { method: 'POST', body: JSON.stringify({ taskName, durationMillis }) });
export const resizePool = (poolId, corePoolSize, maxPoolSize) =>
  apiFetch(`${BASE}/${poolId}/resize`, { method: 'POST', body: JSON.stringify({ corePoolSize, maxPoolSize }) });
export const shutdownPool = (poolId) => apiFetch(`${BASE}/${poolId}/shutdown`, { method: 'POST' });

export const simReset = () => apiFetch(`${BASE}/sim/reset`, { method: 'POST' });
export const simSubmit = (step) => apiFetch(`${BASE}/sim/submit`, { method: 'POST', body: JSON.stringify({ step }) });
export const simRelease = (step) => apiFetch(`${BASE}/sim/release`, { method: 'POST', body: JSON.stringify({ step }) });
export const simShutdown = (step) => apiFetch(`${BASE}/sim/shutdown`, { method: 'POST', body: JSON.stringify({ step }) });
export const simGetEvents = () => apiFetch(`${BASE}/sim/events`);
export const simGetSnapshot = () => apiFetch(`${BASE}/sim/snapshot`);
