const API = '/api/splitwise';

async function handleResponse(res) {
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getUsers() {
  const res = await fetch(`${API}/users`);
  return handleResponse(res);
}

export async function createUser(name, email) {
  const res = await fetch(`${API}/users`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email })
  });
  return handleResponse(res);
}

export async function createGroup(name, memberIds) {
  const res = await fetch(`${API}/groups`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, memberIds })
  });
  return handleResponse(res);
}

export async function getGroups() {
  const res = await fetch(`${API}/groups`);
  return handleResponse(res);
}

export async function addMember(groupId, userId) {
  const res = await fetch(`${API}/groups/${groupId}/members/${userId}`, { method: 'PUT' });
  return handleResponse(res);
}

export async function addExpense(description, amount, paidBy, groupId, splits) {
  const res = await fetch(`${API}/expenses`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, amount, paidBy, groupId, splits })
  });
  return handleResponse(res);
}

export async function getGroupExpenses(groupId) {
  const res = await fetch(`${API}/groups/${groupId}/expenses`);
  return handleResponse(res);
}

export async function getBalances(userId) {
  const res = await fetch(`${API}/users/${userId}/balances`);
  return handleResponse(res);
}

export async function settleUp(fromUserId, toUserId, groupId, amount) {
  const res = await fetch(`${API}/settle`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromUserId, toUserId, groupId, amount })
  });
  return handleResponse(res);
}

export async function getTransactions(userId) {
  const res = await fetch(`${API}/users/${userId}/transactions`);
  return handleResponse(res);
}
