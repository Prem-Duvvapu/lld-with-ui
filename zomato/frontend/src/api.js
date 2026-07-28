const BASE = 'http://localhost:8081/api/zomato';

export async function getRestaurants() {
  const res = await fetch(`${BASE}/restaurants`);
  return res.json();
}

export async function getRestaurant(id) {
  const res = await fetch(`${BASE}/restaurants/${id}`);
  return res.json();
}

export async function getMenu(id) {
  const res = await fetch(`${BASE}/restaurants/${id}/menu`);
  return res.json();
}

export async function placeOrder(restaurantId, userId, items) {
  const res = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ restaurantId, userId, items }),
  });
  return res.json();
}

export async function getOrder(id) {
  const res = await fetch(`${BASE}/orders/${id}`);
  return res.json();
}

export async function getUserOrders(userId) {
  const res = await fetch(`${BASE}/orders?userId=${userId}`);
  return res.json();
}

export async function updateOrderStatus(id, status) {
  const res = await fetch(`${BASE}/orders/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return res.json();
}
