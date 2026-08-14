import { apiFetch } from '../../utils/api'

export function getProducts(params = {}) {
  const queryStr = new URLSearchParams(params).toString()
  return apiFetch(`/shoppingcart/products${queryStr ? '?' + queryStr : ''}`)
}

export function getUsers() {
  return apiFetch('/shoppingcart/users')
}

export function getCart(userId) {
  return apiFetch(`/shoppingcart/cart/${userId}`)
}

export function addToCart(userId, productId, quantity = 1) {
  return apiFetch(`/shoppingcart/cart/${userId}/add`, {
    method: 'POST',
    body: JSON.stringify({ productId, quantity }),
  })
}

export function removeFromCart(userId, productId) {
  return apiFetch(`/shoppingcart/cart/${userId}/remove`, {
    method: 'POST',
    body: JSON.stringify({ productId }),
  })
}

export function updateCartQuantity(userId, productId, quantity) {
  return apiFetch(`/shoppingcart/cart/${userId}/update`, {
    method: 'POST',
    body: JSON.stringify({ productId, quantity }),
  })
}

export function undoLastCartAction(userId) {
  return apiFetch(`/shoppingcart/cart/${userId}/undo`, {
    method: 'POST',
  })
}

export function placeOrder(userId, paymentMethod, idempotencyKey) {
  return apiFetch('/shoppingcart/checkout', {
    method: 'POST',
    body: JSON.stringify({ userId, paymentMethod, idempotencyKey }),
  })
}

export function getUserOrders(userId) {
  return apiFetch(`/shoppingcart/orders/user/${userId}`)
}

export function getAllOrders() {
  return apiFetch('/shoppingcart/orders')
}

export function updateOrderStatus(orderId, status) {
  return apiFetch(`/shoppingcart/orders/${orderId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  })
}

export function cancelOrder(orderId) {
  return apiFetch(`/shoppingcart/orders/${orderId}/cancel`, {
    method: 'POST',
  })
}

// Simulation endpoints
export function simReset() {
  return apiFetch('/shoppingcart/sim/reset', { method: 'POST' })
}

export function simAddToCart(userId, productId, quantity) {
  return apiFetch('/shoppingcart/sim/add-to-cart', {
    method: 'POST',
    body: JSON.stringify({ userId, productId, quantity }),
  })
}

export function simPlaceOrder(userId, paymentMethod) {
  return apiFetch('/shoppingcart/sim/place-order', {
    method: 'POST',
    body: JSON.stringify({ userId, paymentMethod }),
  })
}

export function simUpdateStatus(orderId, status) {
  return apiFetch('/shoppingcart/sim/update-status', {
    method: 'POST',
    body: JSON.stringify({ orderId, status }),
  })
}

export function simGetEvents() {
  return apiFetch('/shoppingcart/sim/events')
}

export function simGetSnapshots() {
  return apiFetch('/shoppingcart/sim/snapshots')
}