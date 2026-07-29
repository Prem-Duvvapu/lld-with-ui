const API = '/api/shopping-cart';

export async function getProducts() {
  const res = await fetch(`${API}/products`);
  return res.json();
}

export async function addToCart(cartId, userId, productId, quantity) {
  const res = await fetch(`${API}/cart/add`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartId, userId, productId, quantity })
  });
  return res.json();
}

export async function removeFromCart(cartId, productId) {
  const res = await fetch(`${API}/cart/${cartId}/remove`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId })
  });
  return res.json();
}

export async function updateQuantity(cartId, productId, quantity) {
  const res = await fetch(`${API}/cart/${cartId}/update`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity })
  });
  return res.json();
}

export async function getCart(cartId) {
  const res = await fetch(`${API}/cart/${cartId}`);
  return res.json();
}

export async function checkout(cartId, shippingAddress) {
  const res = await fetch(`${API}/cart/${cartId}/checkout`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shippingAddress })
  });
  return res.json();
}

export async function updateOrderStatus(orderId, status) {
  const res = await fetch(`${API}/orders/${orderId}/status`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  return res.json();
}

export async function getOrders() {
  const res = await fetch(`${API}/orders`);
  return res.json();
}

export async function getOrder(orderId) {
  const res = await fetch(`${API}/orders/${orderId}`);
  return res.json();
}