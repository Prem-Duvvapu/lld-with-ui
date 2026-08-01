import { apiFetch } from '../../utils/api';

export function getMenu() {
  return apiFetch('/coffee-machine/menu');
}

export function getStatus() {
  return apiFetch('/coffee-machine/status');
}

export function selectBeverage(beverageId) {
  return apiFetch('/coffee-machine/select', {
    method: 'POST',
    body: JSON.stringify({ beverageId })
  });
}

export function brew(beverageId) {
  return apiFetch('/coffee-machine/brew', {
    method: 'POST',
    body: JSON.stringify({ beverageId })
  });
}

export function refillIngredient(ingredient, amount) {
  return apiFetch('/coffee-machine/refill', {
    method: 'POST',
    body: JSON.stringify({ ingredient, amount })
  });
}

export function resetMachine() {
  return apiFetch('/coffee-machine/reset', { method: 'POST' });
}

export function getOrders() {
  return apiFetch('/coffee-machine/orders');
}