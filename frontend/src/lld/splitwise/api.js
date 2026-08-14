import { apiFetch } from '../../utils/api';

export function getUsers() {
  return apiFetch('/splitwise/users');
}

export function createUser(name, email) {
  return apiFetch('/splitwise/users', {
    method: 'POST',
    body: JSON.stringify({ name, email }),
  });
}

export function createGroup(name, memberIds) {
  return apiFetch('/splitwise/groups', {
    method: 'POST',
    body: JSON.stringify({ name, memberIds }),
  });
}

export function getGroups() {
  return apiFetch('/splitwise/groups');
}

export function addMember(groupId, userId) {
  return apiFetch(`/splitwise/groups/${groupId}/members/${userId}`, {
    method: 'PUT',
  });
}

export function addExpense(description, amount, paidBy, groupId, splits) {
  return apiFetch('/splitwise/expenses', {
    method: 'POST',
    body: JSON.stringify({ description, amount, paidBy, groupId, splits }),
  });
}

export function getGroupExpenses(groupId) {
  return apiFetch(`/splitwise/groups/${groupId}/expenses`);
}

export function getBalances(userId) {
  return apiFetch(`/splitwise/users/${userId}/balances`);
}

export function settleUp(fromUserId, toUserId, groupId, amount) {
  return apiFetch('/splitwise/settle', {
    method: 'POST',
    body: JSON.stringify({ fromUserId, toUserId, groupId, amount }),
  });
}

export function getTransactions(userId) {
  return apiFetch(`/splitwise/users/${userId}/transactions`);
}

export function getSimplifiedDebts(groupId) {
  return apiFetch(`/splitwise/groups/${groupId}/simplified-debts`);
}

export function getEvents() {
  return apiFetch('/splitwise/events');
}

// --- ISOLATED SIMULATION API ---
export function simReset() {
  return apiFetch('/splitwise/sim/reset', { method: 'POST' });
}

export function simCreateUser(name, email) {
  return apiFetch('/splitwise/sim/users', {
    method: 'POST',
    body: JSON.stringify({ name, email }),
  });
}

export function simCreateGroup(name, memberIds) {
  return apiFetch('/splitwise/sim/groups', {
    method: 'POST',
    body: JSON.stringify({ name, memberIds }),
  });
}

export function simAddExpense(description, amount, paidBy, groupId, splits) {
  return apiFetch('/splitwise/sim/expenses', {
    method: 'POST',
    body: JSON.stringify({ description, amount, paidBy, groupId, splits }),
  });
}

export function simSettleUp(fromUserId, toUserId, groupId, amount) {
  return apiFetch('/splitwise/sim/settle', {
    method: 'POST',
    body: JSON.stringify({ fromUserId, toUserId, groupId, amount }),
  });
}

export function simGetBalances() {
  return apiFetch('/splitwise/sim/balances');
}

export function simGetEvents() {
  return apiFetch('/splitwise/sim/events');
}

export function simGetSimplifiedDebts(groupId) {
  return apiFetch(`/splitwise/sim/groups/${groupId}/simplified-debts`);
}
