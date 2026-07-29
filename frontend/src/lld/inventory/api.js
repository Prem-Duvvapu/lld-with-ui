const API = '/api/inventory';

export async function getProducts(category) {
  const params = category ? `?category=${category}` : '';
  const res = await fetch(`${API}/products${params}`);
  return res.json();
}

export async function addProduct(product) {
  const res = await fetch(`${API}/products`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
  return res.json();
}

export async function updateStock(productId, quantity, type, reason) {
  const res = await fetch(`${API}/products/${productId}/stock`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity, type, reason })
  });
  return res.json();
}

export async function getLowStockItems(threshold) {
  const res = await fetch(`${API}/products/low-stock?threshold=${threshold}`);
  return res.json();
}

export async function transferStock(productId, fromLocation, toLocation, quantity) {
  const res = await fetch(`${API}/products/${productId}/transfer`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromLocation, toLocation, quantity: String(quantity) })
  });
  return res.json();
}

export async function getStockMovements(productId) {
  const res = await fetch(`${API}/products/${productId}/movements`);
  return res.json();
}

export async function getSuppliers() {
  const res = await fetch(`${API}/suppliers`);
  return res.json();
}