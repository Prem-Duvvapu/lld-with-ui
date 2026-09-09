import { apiFetch } from '../../utils/api';

export const getStatus = () => apiFetch('/traffic/status');
export const transition = () => apiFetch('/traffic/transition', { method: 'POST' });
export const emergency = (lightId) => apiFetch(`/traffic/emergency?lightId=${lightId}`, { method: 'POST' });

// Isolated simulation sandbox. Keep every walkthrough call under /sim/* so the demo can never
// advance or override the live intersection shown on the operational tab.
export const simReset = () => apiFetch('/traffic/sim/reset', { method: 'POST' });
export const simTick = (seconds, step) => apiFetch('/traffic/sim/tick', {
  method: 'POST',
  body: JSON.stringify({ seconds, step }),
});
export const simEmergency = (lightId, step) => apiFetch('/traffic/sim/emergency', {
  method: 'POST',
  body: JSON.stringify({ lightId, step }),
});
export const simResume = (step) => apiFetch('/traffic/sim/resume', {
  method: 'POST',
  body: JSON.stringify({ step }),
});
export const simManualTransition = (lightId, target, step) => apiFetch('/traffic/sim/manual-transition', {
  method: 'POST',
  body: JSON.stringify({ lightId, target, step }),
});
export const simGetEvents = () => apiFetch('/traffic/sim/events');
export const simGetSnapshot = () => apiFetch('/traffic/sim/snapshot');
