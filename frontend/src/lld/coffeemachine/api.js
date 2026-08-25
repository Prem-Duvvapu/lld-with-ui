const BASE_URL = '/api/coffeemachine';

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || 'API request failed');
  }
  return res.json();
}

// Production Endpoints
export function getMenu() {
  return fetch(`${BASE_URL}/menu`).then(handleResponse);
}

export function getStatus() {
  return fetch(`${BASE_URL}/status`).then(handleResponse);
}

export function getInventory() {
  return fetch(`${BASE_URL}/inventory`).then(handleResponse);
}

export function getOrders() {
  return fetch(`${BASE_URL}/orders`).then(handleResponse);
}

export function startOrder(coffeeType) {
  return fetch(`${BASE_URL}/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coffeeType }),
  }).then(handleResponse);
}

export function addCustomization(customization) {
  return fetch(`${BASE_URL}/customize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customization }),
  }).then(handleResponse);
}

export function insertPayment(amount) {
  return fetch(`${BASE_URL}/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  }).then(handleResponse);
}

export function brew() {
  return fetch(`${BASE_URL}/brew`, {
    method: 'POST',
  }).then(handleResponse);
}

export function collectCoffee() {
  return fetch(`${BASE_URL}/collect`, {
    method: 'POST',
  }).then(handleResponse);
}

export function cancelOrder() {
  return fetch(`${BASE_URL}/cancel`, {
    method: 'POST',
  }).then(handleResponse);
}

export function refillIngredient(ingredient, amount = 500) {
  return fetch(`${BASE_URL}/refill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredient, amount }),
  }).then(handleResponse);
}

// Simulation Endpoints
export function simReset() {
  return fetch(`${BASE_URL}/sim/reset`, {
    method: 'POST',
  }).then(handleResponse);
}

export function simSelectBase(coffeeType, step = 2) {
  return fetch(`${BASE_URL}/sim/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coffeeType, step }),
  }).then(handleResponse);
}

export function simAddCustomization(customization, step = 3) {
  return fetch(`${BASE_URL}/sim/customize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customization, step }),
  }).then(handleResponse);
}

export function simInsertPayment(amount, step = 4) {
  return fetch(`${BASE_URL}/sim/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, step }),
  }).then(handleResponse);
}

export function simBrew(step = 5) {
  return fetch(`${BASE_URL}/sim/brew`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step }),
  }).then(handleResponse);
}

export function simCollect(step = 6) {
  return fetch(`${BASE_URL}/sim/collect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step }),
  }).then(handleResponse);
}

export function simCancel(step = 7) {
  return fetch(`${BASE_URL}/sim/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step }),
  }).then(handleResponse);
}

export function simRefill(ingredient, amount = 500, step = 7) {
  return fetch(`${BASE_URL}/sim/refill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredient, amount, step }),
  }).then(handleResponse);
}

export function simSetStock(ingredient, level, step = 7) {
  return fetch(`${BASE_URL}/sim/set-stock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredient, level, step }),
  }).then(handleResponse);
}

export function simRace(step = 8) {
  return fetch(`${BASE_URL}/sim/race`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step }),
  }).then(handleResponse);
}

export function simGetEvents() {
  return fetch(`${BASE_URL}/sim/events`).then(handleResponse);
}

export function simGetSnapshot() {
  return fetch(`${BASE_URL}/sim/snapshot`).then(handleResponse);
}