import { apiFetch } from '../../utils/api';

const BASE = '/featureflag';

// --- live ---------------------------------------------------------------

export const createFlag = (key, description) =>
  apiFetch(`${BASE}/flags`, { method: 'POST', body: JSON.stringify({ key, description }) });

export const listFlags = () => apiFetch(`${BASE}/flags`);

export const getFlag = (key) => apiFetch(`${BASE}/flags/${key}`);

export const setEnabled = (key, enabled) =>
  apiFetch(`${BASE}/flags/${key}/enabled`, { method: 'PUT', body: JSON.stringify({ enabled }) });

export const updateRules = (key, rule) =>
  apiFetch(`${BASE}/flags/${key}/rules`, { method: 'PUT', body: JSON.stringify(rule) });

export const evaluate = (key, ctx) =>
  apiFetch(`${BASE}/flags/${key}/evaluate`, { method: 'POST', body: JSON.stringify(ctx) });

// --- isolated /sim/* sandbox ---------------------------------------------

export const simReset = () => apiFetch(`${BASE}/sim/reset`, { method: 'POST' });

export const simCreateFlag = (step) =>
  apiFetch(`${BASE}/sim/create`, { method: 'POST', body: JSON.stringify({ step }) });

export const simSetEnabled = (enabled, step) =>
  apiFetch(`${BASE}/sim/enabled`, { method: 'POST', body: JSON.stringify({ enabled, step }) });

export const simSetRule = (rule, label, step) =>
  apiFetch(`${BASE}/sim/rule`, { method: 'POST', body: JSON.stringify({ rule, label, step }) });

export const simEvaluate = (userLabel, userId, country, attributes, step) =>
  apiFetch(`${BASE}/sim/evaluate`, {
    method: 'POST',
    body: JSON.stringify({ userLabel, userId, country, attributes, step }),
  });

export const simConcurrentUpdateDemo = (step) =>
  apiFetch(`${BASE}/sim/concurrent-demo`, { method: 'POST', body: JSON.stringify({ step }) });

export const simGetEvents = () => apiFetch(`${BASE}/sim/events`);

export const simGetSnapshot = () => apiFetch(`${BASE}/sim/snapshot`);
