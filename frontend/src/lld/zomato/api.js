import { apiFetch } from '../../utils/api';

export function getRestaurants() {
  return apiFetch('/zomato/restaurants');
}

export function getRestaurant(id) {
  return apiFetch(`/zomato/restaurants/${id}`);
}

export function getMenu(id) {
  return apiFetch(`/zomato/restaurants/${id}/menu`);
}

export function placeOrder(restaurantId, userId, items) {
  return apiFetch('/zomato/orders', {
    method: 'POST',
    body: JSON.stringify({ restaurantId, userId, items }),
  });
}

export function getOrder(id) {
  return apiFetch(`/zomato/orders/${id}`);
}

export function getUserOrders(userId) {
  return apiFetch(`/zomato/orders?userId=${userId}`);
}

export function updateOrderStatus(id, status) {
  return apiFetch(`/zomato/orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}
