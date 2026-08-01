import { apiFetch } from '../../utils/api';

export function getProducts(category) {
  const params = category ? `?category=${category}` : '';
  return apiFetch(`/inventory/products${params}`);
}

export function addProduct(product) {
  return apiFetch('/inventory/products', {
    method: 'POST',
    body: JSON.stringify(product)
  });
}

export function updateStock(productId, quantity, type, reason) {
  return apiFetch(`/inventory/products/${productId}/stock`, {
    method: 'POST',
    body: JSON.stringify({ quantity, type, reason })
  });
}

export function getLowStockItems(threshold) {
  return apiFetch(`/inventory/products/low-stock?threshold=${threshold}`);
}

export function transferStock(productId, fromLocation, toLocation, quantity) {
  return apiFetch(`/inventory/products/${productId}/transfer`, {
    method: 'POST',
    body: JSON.stringify({ fromLocation, toLocation, quantity: String(quantity) })
  });
}

export function getStockMovements(productId) {
  return apiFetch(`/inventory/products/${productId}/movements`);
}

export function getSuppliers() {
  return apiFetch('/inventory/suppliers');
}