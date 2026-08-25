import { apiFetch } from '../../utils/api';

// ------------------------------------------------------------------ boards

export function createBoard(name) {
  return apiFetch('/tasks/boards', { method: 'POST', body: JSON.stringify({ name }) });
}

export function listBoards() {
  return apiFetch('/tasks/boards');
}

export function getBoard(boardId) {
  return apiFetch(`/tasks/boards/${boardId}`);
}

export function getBoardTasks(boardId, status) {
  const params = status ? `?status=${status}` : '';
  return apiFetch(`/tasks/boards/${boardId}/tasks${params}`);
}

export function getOrderedTasks(boardId, policy) {
  return apiFetch(`/tasks/boards/${boardId}/ordered?policy=${policy}`);
}

// ------------------------------------------------------------------- tasks

export function createTask(boardId, data) {
  return apiFetch(`/tasks/boards/${boardId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getTask(id) {
  return apiFetch(`/tasks/${id}`);
}

export function updateStatus(id, status) {
  return apiFetch(`/tasks/${id}/status?status=${status}`, { method: 'PUT' });
}

export function updatePriority(id, priority) {
  return apiFetch(`/tasks/${id}/priority?priority=${priority}`, { method: 'PUT' });
}

export function updateAssignee(id, assignee) {
  return apiFetch(`/tasks/${id}/assignee?assignee=${encodeURIComponent(assignee)}`, { method: 'PUT' });
}

export function claimTask(id, actor) {
  return apiFetch(`/tasks/${id}/claim`, { method: 'POST', body: JSON.stringify({ actor }) });
}

export function deleteTask(id) {
  return apiFetch(`/tasks/${id}`, { method: 'DELETE' });
}

// --------------------------------------------------------------------- sim

export function simReset() {
  return apiFetch('/tasks/sim/reset', { method: 'POST' });
}

export function simState() {
  return apiFetch('/tasks/sim/state');
}

export function simMove(taskId, status, step) {
  return apiFetch('/tasks/sim/move', { method: 'POST', body: JSON.stringify({ taskId, status, step }) });
}

export function simClaim(taskId, actor, step) {
  return apiFetch('/tasks/sim/claim', { method: 'POST', body: JSON.stringify({ taskId, actor, step }) });
}

export function simOrder(policy, step) {
  return apiFetch('/tasks/sim/order', { method: 'POST', body: JSON.stringify({ policy, step }) });
}

export function simClaimRace(taskId, actors, step) {
  return apiFetch('/tasks/sim/claim-race', { method: 'POST', body: JSON.stringify({ taskId, actors, step }) });
}

export function simTransitionRace(taskId, first, second, step) {
  return apiFetch('/tasks/sim/transition-race', { method: 'POST', body: JSON.stringify({ taskId, first, second, step }) });
}

export function simEvents() {
  return apiFetch('/tasks/sim/events');
}
