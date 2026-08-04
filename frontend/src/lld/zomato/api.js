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
