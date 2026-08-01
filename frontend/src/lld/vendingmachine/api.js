import { apiFetch } from '../../utils/api';

export function getProducts() {
  return apiFetch('/vending-machine/products');
}

export function selectProduct(productId, quantity = 1) {
  return apiFetch('/vending-machine/select', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity })
  });
}

export function insertCoin(transactionId, amount) {
  return apiFetch(`/vending-machine/${transactionId}/insert-coin`, {
    method: 'POST',
    body: JSON.stringify({ amount })
  });
}

export function dispense(transactionId) {
  return apiFetch(`/vending-machine/${transactionId}/dispense`, {
    method: 'POST'
  });
}

export function cancelTransaction(transactionId) {
  return apiFetch(`/vending-machine/${transactionId}/cancel`, {
    method: 'POST'
  });
}
