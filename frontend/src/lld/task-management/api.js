const BASE_URL = '/api/tasks';

export async function createTask(data) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateStatus(id, status) {
  const res = await fetch(`${BASE_URL}/${id}/status?status=${status}`, { method: 'PUT' });
  return res.json();
}

export async function updatePriority(id, priority) {
  const res = await fetch(`${BASE_URL}/${id}/priority?priority=${priority}`, { method: 'PUT' });
  return res.json();
}

export async function updateAssignee(id, assignee) {
  const res = await fetch(`${BASE_URL}/${id}/assignee?assignee=${encodeURIComponent(assignee)}`, { method: 'PUT' });
  return res.json();
}

export async function getAllTasks() {
  const res = await fetch(BASE_URL);
  return res.json();
}

export async function getTasksByStatus(status) {
  const res = await fetch(`${BASE_URL}/status/${status}`);
  return res.json();
}

export async function deleteTask(id) {
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
  return res.json();
}
