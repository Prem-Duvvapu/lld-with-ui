import { apiFetch } from '../../utils/api';

export const getStatus = () => apiFetch('/traffic/status');
export const transition = () => apiFetch('/traffic/transition', { method: 'POST' });
export const emergency = (lightId) => apiFetch(`/traffic/emergency?lightId=${lightId}`, { method: 'POST' });
