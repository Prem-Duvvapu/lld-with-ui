import { apiFetch } from '../../utils/api';

const BASE = '/stockbroker';

// Stocks, Accounts & Depth
export function getStocks() {
  return apiFetch(`${BASE}/stocks`);
}

export function getStock(symbol) {
  return apiFetch(`${BASE}/stocks/${symbol}`);
}

export function getOrderBookDepth(symbol) {
  return apiFetch(`${BASE}/orderbook/${symbol}`);
}

export function getAccount(accountId) {
  return apiFetch(`${BASE}/accounts/${accountId}`);
}

export function getAccountOrders(accountId) {
  return apiFetch(`${BASE}/accounts/${accountId}/orders`);
}

export function getRecentQuotes() {
  return apiFetch(`${BASE}/quotes`);
}

// Order Management
export function placeOrder(orderData) {
  return apiFetch(`${BASE}/orders`, {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

export function cancelOrder(orderId) {
  return apiFetch(`${BASE}/orders/${orderId}/cancel`, { method: 'POST' });
}

// Isolated Simulation Endpoints
export function simReset() {
  return apiFetch(`${BASE}/sim/reset`, { method: 'POST' });
}

export function simPlaceOrder(orderData) {
  return apiFetch(`${BASE}/sim/order`, {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

export function simCancelOrder(orderId) {
  return apiFetch(`${BASE}/sim/cancel`, {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  });
}

export function simGetSnapshots() {
  return apiFetch(`${BASE}/sim/snapshots`);
}

export function simGetEvents() {
  return apiFetch(`${BASE}/sim/events`);
}
