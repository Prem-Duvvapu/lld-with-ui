import { apiFetch } from '../../utils/api';

export function createTask(data) {
  return apiFetch('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
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

export function getAllTasks() {
  return apiFetch('/tasks');
}

export function getTasksByStatus(status) {
  return apiFetch(`/tasks/status/${status}`);
}

export function deleteTask(id) {
  return apiFetch(`/tasks/${id}`, { method: 'DELETE' });
}
