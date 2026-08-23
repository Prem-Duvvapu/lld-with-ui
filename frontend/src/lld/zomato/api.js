import { apiFetch } from '../../utils/api';

// Customers
export const getCustomers = () => apiFetch('/zomato/customers');
export const registerCustomer = (data) =>
  apiFetch('/zomato/customers', { method: 'POST', body: JSON.stringify(data) });

// Restaurants
export const getRestaurants = () => apiFetch('/zomato/restaurants');
export const getRestaurant = (id) => apiFetch(`/zomato/restaurants/${id}`);
export const updateMenuItemAvailability = (restaurantId, itemId, available) =>
  apiFetch(`/zomato/restaurants/${restaurantId}/menu/${itemId}/availability`, {
    method: 'PUT',
    body: JSON.stringify({ available }),
  });
export const addMenuItem = (restaurantId, menuItem) =>
  apiFetch(`/zomato/restaurants/${restaurantId}/menu`, {
    method: 'POST',
    body: JSON.stringify(menuItem),
  });

// Delivery Agents
export const getDeliveryAgents = () => apiFetch('/zomato/agents');
export const toggleAgentAvailability = (agentId, available) =>
  apiFetch(`/zomato/agents/${agentId}/availability`, {
    method: 'PUT',
    body: JSON.stringify({ available }),
  });

// Orders
export const placeOrder = (orderData) =>
  apiFetch('/zomato/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });

export const getOrders = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/zomato/orders${query ? `?${query}` : ''}`);
};

export const getOrder = (id) => apiFetch(`/zomato/orders/${id}`);
export const confirmOrder = (id) => apiFetch(`/zomato/orders/${id}/confirm`, { method: 'PUT' });
export const startPreparingOrder = (id) => apiFetch(`/zomato/orders/${id}/prepare`, { method: 'PUT' });
export const markReadyForPickup = (id) => apiFetch(`/zomato/orders/${id}/ready`, { method: 'PUT' });
export const verifyOtpAndDeliver = (id, otp) =>
  apiFetch(`/zomato/orders/${id}/verify-otp`, {
    method: 'PUT',
    body: JSON.stringify({ otp }),
  });
export const cancelOrder = (id, reason) =>
  apiFetch(`/zomato/orders/${id}/cancel`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  });

// Notifications
export const getNotifications = (recipientId) =>
  apiFetch(`/zomato/notifications${recipientId ? `?recipientId=${recipientId}` : ''}`);

// Simulation Sandbox Endpoints (/sim/*)
export const simReset = () => apiFetch('/zomato/sim/reset', { method: 'POST' });
export const simState = () => apiFetch('/zomato/sim/state');
export const simOrder = (data = {}) =>
  apiFetch('/zomato/sim/order', { method: 'POST', body: JSON.stringify(data) });
export const simConfirm = (orderId) =>
  apiFetch('/zomato/sim/confirm', { method: 'POST', body: JSON.stringify({ orderId }) });
export const simPrepare = (orderId) =>
  apiFetch('/zomato/sim/prepare', { method: 'POST', body: JSON.stringify({ orderId }) });
export const simReady = (orderId) =>
  apiFetch('/zomato/sim/ready', { method: 'POST', body: JSON.stringify({ orderId }) });
export const simDeliver = (orderId, otp) =>
  apiFetch('/zomato/sim/deliver', { method: 'POST', body: JSON.stringify({ orderId, otp }) });
export const simCancel = (orderId, reason) =>
  apiFetch('/zomato/sim/cancel', { method: 'POST', body: JSON.stringify({ orderId, reason }) });
export const simRace = (agentId = 'AGENT-201', orders = 5) =>
  apiFetch('/zomato/sim/race', { method: 'POST', body: JSON.stringify({ agentId, orders }) });
export const simEvents = () => apiFetch('/zomato/sim/events');
