import { apiFetch } from '../../utils/api';

// ---- Live Restaurant Endpoints ----

export function getTables() {
  return apiFetch('/restaurant/tables');
}

export function getMenu() {
  return apiFetch('/restaurant/menu');
}

export function seatGuests(tableId, partySize) {
  return apiFetch(`/restaurant/tables/${tableId}/seat`, {
    method: 'POST',
    body: JSON.stringify({ partySize }),
  });
}

export function placeOrder(tableId, waiterName, lines, notes) {
  return apiFetch('/restaurant/orders', {
    method: 'POST',
    body: JSON.stringify({ tableId, waiterName, lines, notes }),
  });
}

export function getOrders() {
  return apiFetch('/restaurant/orders');
}

export function getOrder(orderId) {
  return apiFetch(`/restaurant/orders/${orderId}`);
}

export function cancelOrder(orderId) {
  return apiFetch(`/restaurant/orders/${orderId}/cancel`, { method: 'POST' });
}

export function getPendingKitchenOrders() {
  return apiFetch('/restaurant/kitchen/pending');
}

export function startPreparation(orderId) {
  return apiFetch(`/restaurant/kitchen/${orderId}/prepare`, { method: 'POST' });
}

export function markReady(orderId) {
  return apiFetch(`/restaurant/kitchen/${orderId}/ready`, { method: 'POST' });
}

export function markServed(orderId) {
  return apiFetch(`/restaurant/kitchen/${orderId}/serve`, { method: 'POST' });
}

export function generateBill(orderId) {
  return apiFetch(`/restaurant/orders/${orderId}/bill`, { method: 'POST' });
}

export function payBill(billId, method) {
  return apiFetch(`/restaurant/bills/${billId}/pay`, {
    method: 'POST',
    body: JSON.stringify({ method }),
  });
}

// ---- Isolated Simulation Endpoints (/sim/*) ----

export function simReset() {
  return apiFetch('/restaurant/sim/reset', { method: 'POST' });
}

export function simState() {
  return apiFetch('/restaurant/sim/state');
}

export function simSeat(tableId, partySize) {
  return apiFetch('/restaurant/sim/seat', {
    method: 'POST',
    body: JSON.stringify({ tableId, partySize }),
  });
}

export function simOrder(tableId, waiterName, lines, notes) {
  return apiFetch('/restaurant/sim/order', {
    method: 'POST',
    body: JSON.stringify({ tableId, waiterName, lines, notes }),
  });
}

export function simPrepare(orderId) {
  return apiFetch('/restaurant/sim/prepare', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  });
}

export function simReady(orderId) {
  return apiFetch('/restaurant/sim/ready', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  });
}

export function simServe(orderId) {
  return apiFetch('/restaurant/sim/serve', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  });
}

export function simBill(orderId) {
  return apiFetch('/restaurant/sim/bill', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  });
}

export function simPay(billId, method) {
  return apiFetch('/restaurant/sim/pay', {
    method: 'POST',
    body: JSON.stringify({ billId, method }),
  });
}

export function simEvents() {
  return apiFetch('/restaurant/sim/events');
}
