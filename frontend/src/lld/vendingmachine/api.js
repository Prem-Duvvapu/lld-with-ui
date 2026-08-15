const BASE_URL = '/api/vendingmachine';

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || 'API request failed');
  }
  return res.json();
}

// Production Endpoints
export function getSlots() {
  return fetch(`${BASE_URL}/slots`).then(handleResponse);
}

export function getProducts() {
  return fetch(`${BASE_URL}/products`).then(handleResponse);
}

export function getStatus() {
  return fetch(`${BASE_URL}/status`).then(handleResponse);
}

export function getChangeInventory() {
  return fetch(`${BASE_URL}/change-inventory`).then(handleResponse);
}

export function getTransactions() {
  return fetch(`${BASE_URL}/transactions`).then(handleResponse);
}

export function selectProduct(slotCode) {
  return fetch(`${BASE_URL}/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotCode }),
  }).then(handleResponse);
}

export function insertMoney(denomination) {
  return fetch(`${BASE_URL}/insert-money`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ denomination }),
  }).then(handleResponse);
}

export function dispense() {
  return fetch(`${BASE_URL}/dispense`, {
    method: 'POST',
  }).then(handleResponse);
}

export function cancelTransaction() {
  return fetch(`${BASE_URL}/cancel`, {
    method: 'POST',
  }).then(handleResponse);
}

export function restock(slotCode, quantity = 5) {
  return fetch(`${BASE_URL}/restock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotCode, quantity }),
  }).then(handleResponse);
}

export function refillChange(denomination, count = 10) {
  return fetch(`${BASE_URL}/refill-change`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ denomination, count }),
  }).then(handleResponse);
}

// Isolated Simulation Endpoints
export function simReset() {
  return fetch(`${BASE_URL}/sim/reset`, {
    method: 'POST',
  }).then(handleResponse);
}

export function simSelect(slotCode, stepNumber = 2) {
  return fetch(`${BASE_URL}/sim/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotCode, stepNumber }),
  }).then(handleResponse);
}

export function simInsertMoney(denomination, stepNumber = 3) {
  return fetch(`${BASE_URL}/sim/insert-money`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ denomination, stepNumber }),
  }).then(handleResponse);
}

export function simDispense(stepNumber = 5) {
  return fetch(`${BASE_URL}/sim/dispense`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stepNumber }),
  }).then(handleResponse);
}

export function simCancel(stepNumber = 8) {
  return fetch(`${BASE_URL}/sim/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stepNumber }),
  }).then(handleResponse);
}

export function simRestock(slotCode, quantity = 5, stepNumber = 7) {
  return fetch(`${BASE_URL}/sim/restock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotCode, quantity, stepNumber }),
  }).then(handleResponse);
}

export function simGetEvents() {
  return fetch(`${BASE_URL}/sim/events`).then(handleResponse);
}

export function simGetSnapshot() {
  return fetch(`${BASE_URL}/sim/snapshot`).then(handleResponse);
}
