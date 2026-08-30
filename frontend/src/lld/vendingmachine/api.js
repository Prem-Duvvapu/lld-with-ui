import { apiFetch } from '../../utils/api';

const BASE_URL = '/api/vendingmachine';

// Production Endpoints
export function getSlots() {
  return apiFetch(`${BASE_URL}/slots`);
}

export function getProducts() {
  return apiFetch(`${BASE_URL}/products`);
}

export function getStatus() {
  return apiFetch(`${BASE_URL}/status`);
}

export function getChangeInventory() {
  return apiFetch(`${BASE_URL}/change-inventory`);
}

export function getTransactions() {
  return apiFetch(`${BASE_URL}/transactions`);
}

export function selectProduct(slotCode) {
  return apiFetch(`${BASE_URL}/select`, {
    method: 'POST',
    body: JSON.stringify({ slotCode }),
  });
}

export function insertMoney(denomination) {
  return apiFetch(`${BASE_URL}/insert-money`, {
    method: 'POST',
    body: JSON.stringify({ denomination }),
  });
}

export function dispense() {
  return apiFetch(`${BASE_URL}/dispense`, {
    method: 'POST',
  });
}

export function cancelTransaction() {
  return apiFetch(`${BASE_URL}/cancel`, {
    method: 'POST',
  });
}

export function restock(slotCode, quantity = 5) {
  return apiFetch(`${BASE_URL}/restock`, {
    method: 'POST',
    body: JSON.stringify({ slotCode, quantity }),
  });
}

export function refillChange(denomination, count = 10) {
  return apiFetch(`${BASE_URL}/refill-change`, {
    method: 'POST',
    body: JSON.stringify({ denomination, count }),
  });
}

// Isolated Simulation Endpoints
export function simReset() {
  return apiFetch(`${BASE_URL}/sim/reset`, {
    method: 'POST',
  });
}

export function simSelect(slotCode, stepNumber = 2) {
  return apiFetch(`${BASE_URL}/sim/select`, {
    method: 'POST',
    body: JSON.stringify({ slotCode, stepNumber }),
  });
}

export function simInsertMoney(denomination, stepNumber = 3) {
  return apiFetch(`${BASE_URL}/sim/insert-money`, {
    method: 'POST',
    body: JSON.stringify({ denomination, stepNumber }),
  });
}

export function simDispense(stepNumber = 5) {
  return apiFetch(`${BASE_URL}/sim/dispense`, {
    method: 'POST',
    body: JSON.stringify({ stepNumber }),
  });
}

export function simCancel(stepNumber = 8) {
  return apiFetch(`${BASE_URL}/sim/cancel`, {
    method: 'POST',
    body: JSON.stringify({ stepNumber }),
  });
}

export function simRestock(slotCode, quantity = 5, stepNumber = 7) {
  return apiFetch(`${BASE_URL}/sim/restock`, {
    method: 'POST',
    body: JSON.stringify({ slotCode, quantity, stepNumber }),
  });
}

export function simGetEvents() {
  return apiFetch(`${BASE_URL}/sim/events`);
}

export function simGetSnapshot() {
  return apiFetch(`${BASE_URL}/sim/snapshot`);
}
