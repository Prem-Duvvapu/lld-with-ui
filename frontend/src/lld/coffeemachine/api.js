import { apiFetch } from '../../utils/api';

const BASE_URL = '/api/coffeemachine';

// Production Endpoints
export function getMenu() {
  return apiFetch(`${BASE_URL}/menu`);
}

export function getStatus() {
  return apiFetch(`${BASE_URL}/status`);
}

export function getInventory() {
  return apiFetch(`${BASE_URL}/inventory`);
}

export function getOrders() {
  return apiFetch(`${BASE_URL}/orders`);
}

export function startOrder(coffeeType) {
  return apiFetch(`${BASE_URL}/order`, {
    method: 'POST',
    body: JSON.stringify({ coffeeType }),
  });
}

export function addCustomization(customization) {
  return apiFetch(`${BASE_URL}/customize`, {
    method: 'POST',
    body: JSON.stringify({ customization }),
  });
}

export function insertPayment(amount) {
  return apiFetch(`${BASE_URL}/payment`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

export function brew() {
  return apiFetch(`${BASE_URL}/brew`, {
    method: 'POST',
  });
}

export function collectCoffee() {
  return apiFetch(`${BASE_URL}/collect`, {
    method: 'POST',
  });
}

export function cancelOrder() {
  return apiFetch(`${BASE_URL}/cancel`, {
    method: 'POST',
  });
}

export function refillIngredient(ingredient, amount = 500) {
  return apiFetch(`${BASE_URL}/refill`, {
    method: 'POST',
    body: JSON.stringify({ ingredient, amount }),
  });
}

// Simulation Endpoints
export function simReset() {
  return apiFetch(`${BASE_URL}/sim/reset`, {
    method: 'POST',
  });
}

export function simSelectBase(coffeeType, step = 2) {
  return apiFetch(`${BASE_URL}/sim/select`, {
    method: 'POST',
    body: JSON.stringify({ coffeeType, step }),
  });
}

export function simAddCustomization(customization, step = 3) {
  return apiFetch(`${BASE_URL}/sim/customize`, {
    method: 'POST',
    body: JSON.stringify({ customization, step }),
  });
}

export function simInsertPayment(amount, step = 4) {
  return apiFetch(`${BASE_URL}/sim/payment`, {
    method: 'POST',
    body: JSON.stringify({ amount, step }),
  });
}

export function simBrew(step = 5) {
  return apiFetch(`${BASE_URL}/sim/brew`, {
    method: 'POST',
    body: JSON.stringify({ step }),
  });
}

export function simCollect(step = 6) {
  return apiFetch(`${BASE_URL}/sim/collect`, {
    method: 'POST',
    body: JSON.stringify({ step }),
  });
}

export function simCancel(step = 7) {
  return apiFetch(`${BASE_URL}/sim/cancel`, {
    method: 'POST',
    body: JSON.stringify({ step }),
  });
}

export function simRefill(ingredient, amount = 500, step = 7) {
  return apiFetch(`${BASE_URL}/sim/refill`, {
    method: 'POST',
    body: JSON.stringify({ ingredient, amount, step }),
  });
}

export function simSetStock(ingredient, level, step = 7) {
  return apiFetch(`${BASE_URL}/sim/set-stock`, {
    method: 'POST',
    body: JSON.stringify({ ingredient, level, step }),
  });
}

export function simRace(step = 8) {
  return apiFetch(`${BASE_URL}/sim/race`, {
    method: 'POST',
    body: JSON.stringify({ step }),
  });
}

export function simGetEvents() {
  return apiFetch(`${BASE_URL}/sim/events`);
}

export function simGetSnapshot() {
  return apiFetch(`${BASE_URL}/sim/snapshot`);
}
