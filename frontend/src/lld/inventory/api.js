import { apiFetch } from '../../utils/api';

// ------------------------------------------------------------------- live

export function getProducts(category) {
  const params = category ? `?category=${category}` : '';
  return apiFetch(`/inventory/products${params}`);
}

export function addProduct(product) {
  return apiFetch('/inventory/products', {
    method: 'POST',
    body: JSON.stringify(product)
  });
}

export function updateStock(productId, quantity, type, reason) {
  return apiFetch(`/inventory/products/${productId}/stock`, {
    method: 'POST',
    body: JSON.stringify({ quantity, type, reason })
  });
}

export function getLowStockItems(threshold) {
  return apiFetch(`/inventory/products/low-stock?threshold=${threshold}`);
}

export function reorder(productId, policy) {
  return apiFetch(`/inventory/products/${productId}/reorder?policy=${policy}`, {
    method: 'POST'
  });
}

export function transferStock(productId, fromLocation, toLocation, quantity) {
  return apiFetch(`/inventory/products/${productId}/transfer`, {
    method: 'POST',
    body: JSON.stringify({ fromLocation, toLocation, quantity: String(quantity) })
  });
}

export function getStockMovements(productId) {
  return apiFetch(`/inventory/products/${productId}/movements`);
}

export function getSuppliers() {
  return apiFetch('/inventory/suppliers');
}

export function getAlerts() {
  return apiFetch('/inventory/alerts');
}

export function getEvents() {
  return apiFetch('/inventory/events');
}

// -------------------------------------------------------------------- sim

export function simReset() {
  return apiFetch('/inventory/sim/reset', { method: 'POST' });
}

export function simState() {
  return apiFetch('/inventory/sim/state');
}

export function simSell(productId, quantity) {
  return apiFetch('/inventory/sim/sell', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity })
  });
}

export function simRestock(productId, quantity) {
  return apiFetch('/inventory/sim/restock', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity })
  });
}

export function simTransfer(productId, quantity) {
  return apiFetch('/inventory/sim/transfer', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity })
  });
}

export function simReorder(productId, policy) {
  return apiFetch('/inventory/sim/reorder', {
    method: 'POST',
    body: JSON.stringify({ productId, policy })
  });
}

export function simRace(productId, buyers) {
  return apiFetch('/inventory/sim/race', {
    method: 'POST',
    body: JSON.stringify({ productId, buyers })
  });
}

export function simAlerts() {
  return apiFetch('/inventory/sim/alerts');
}

export function simEvents() {
  return apiFetch('/inventory/sim/events');
}
