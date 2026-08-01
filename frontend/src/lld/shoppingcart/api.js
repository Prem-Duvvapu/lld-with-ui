import { apiFetch } from '../../utils/api';

export function getProducts() {
  return apiFetch('/shopping-cart/products');
}

export function addToCart(cartId, userId, productId, quantity) {
  return apiFetch('/shopping-cart/cart/add', {
    method: 'POST',
    body: JSON.stringify({ cartId, userId, productId, quantity })
  });
}

export function removeFromCart(cartId, productId) {
  return apiFetch(`/shopping-cart/cart/${cartId}/remove`, {
    method: 'POST',
    body: JSON.stringify({ productId })
  });
}

export function updateQuantity(cartId, productId, quantity) {
  return apiFetch(`/shopping-cart/cart/${cartId}/update`, {
    method: 'POST',
    body: JSON.stringify({ productId, quantity })
  });
}

export function getCart(cartId) {
  return apiFetch(`/shopping-cart/cart/${cartId}`);
}

export function checkout(cartId, shippingAddress) {
  return apiFetch(`/shopping-cart/cart/${cartId}/checkout`, {
    method: 'POST',
    body: JSON.stringify({ shippingAddress })
  });
}

export function updateOrderStatus(orderId, status) {
  return apiFetch(`/shopping-cart/orders/${orderId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status })
  });
}

export function getOrders() {
  return apiFetch('/shopping-cart/orders');
}

export function getOrder(orderId) {
  return apiFetch(`/shopping-cart/orders/${orderId}`);
}