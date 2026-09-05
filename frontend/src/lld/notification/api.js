import { apiFetch } from '../../utils/api';

const BASE = '/notification';

// --- live ---------------------------------------------------------------

export const send = (recipientId, type, channel, templateData, idempotencyKey, priority) =>
  apiFetch(`${BASE}/notifications`, {
    method: 'POST',
    body: JSON.stringify({ recipientId, type, channel, templateData, idempotencyKey, priority }),
  });

export const getAll = (recipientId) =>
  apiFetch(`${BASE}/notifications${recipientId ? `?recipientId=${recipientId}` : ''}`);

export const getOne = (id) => apiFetch(`${BASE}/notifications/${id}`);

export const setPreference = (userId, type, channel, optedIn) =>
  apiFetch(`${BASE}/preferences/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ type, channel, optedIn }),
  });

export const getPreferences = (userId) => apiFetch(`${BASE}/preferences/${userId}`);

export const getRecipients = () => apiFetch(`${BASE}/recipients`);

// --- isolated /sim/* sandbox ---------------------------------------------

export const simReset = () => apiFetch(`${BASE}/sim/reset`, { method: 'POST' });

export const simSendOtp = (step) => apiFetch(`${BASE}/sim/send-otp?step=${step}`, { method: 'POST' });

export const simSendPromoToOptedOutUser = (step) =>
  apiFetch(`${BASE}/sim/send-promo-opted-out?step=${step}`, { method: 'POST' });

export const simSendWithForcedFailure = (step) =>
  apiFetch(`${BASE}/sim/send-forced-failure?step=${step}`, { method: 'POST' });

export const simRetryOutcome = (step) => apiFetch(`${BASE}/sim/retry-outcome?step=${step}`, { method: 'POST' });

export const simSendDuplicate = (step) => apiFetch(`${BASE}/sim/send-duplicate?step=${step}`, { method: 'POST' });

export const simConcurrentDuplicateRace = (step) =>
  apiFetch(`${BASE}/sim/concurrent-duplicate-race?step=${step}`, { method: 'POST' });

export const simGetEvents = () => apiFetch(`${BASE}/sim/events`);

export const simGetSnapshot = () => apiFetch(`${BASE}/sim/snapshot`);
