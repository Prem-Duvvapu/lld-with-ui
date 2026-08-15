const BASE_URL = '/api/stockbroker';

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'API request failed');
  }
  return res.json();
}

// Stocks, Accounts & Depth
export async function getStocks() {
  const res = await fetch(`${BASE_URL}/stocks`);
  return handleResponse(res);
}

export async function getStock(symbol) {
  const res = await fetch(`${BASE_URL}/stocks/${symbol}`);
  return handleResponse(res);
}

export async function getOrderBookDepth(symbol) {
  const res = await fetch(`${BASE_URL}/orderbook/${symbol}`);
  return handleResponse(res);
}

export async function getAccount(accountId) {
  const res = await fetch(`${BASE_URL}/accounts/${accountId}`);
  return handleResponse(res);
}

export async function getAccountOrders(accountId) {
  const res = await fetch(`${BASE_URL}/accounts/${accountId}/orders`);
  return handleResponse(res);
}

export async function getRecentQuotes() {
  const res = await fetch(`${BASE_URL}/quotes`);
  return handleResponse(res);
}

// Order Management
export async function placeOrder(orderData) {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  return handleResponse(res);
}

export async function cancelOrder(orderId) {
  const res = await fetch(`${BASE_URL}/orders/${orderId}/cancel`, {
    method: 'POST',
  });
  return handleResponse(res);
}

// Simulation Endpoints
export async function simReset() {
  const res = await fetch(`${BASE_URL}/sim/reset`, { method: 'POST' });
  return handleResponse(res);
}

export async function simPlaceOrder(orderData) {
  const res = await fetch(`${BASE_URL}/sim/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  return handleResponse(res);
}

export async function simCancelOrder(orderId) {
  const res = await fetch(`${BASE_URL}/sim/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  });
  return handleResponse(res);
}

export async function simGetSnapshots() {
  const res = await fetch(`${BASE_URL}/sim/snapshots`);
  return handleResponse(res);
}

export async function simGetEvents() {
  const res = await fetch(`${BASE_URL}/sim/events`);
  return handleResponse(res);
}
