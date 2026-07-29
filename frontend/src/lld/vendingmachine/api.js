const API = '/api/vending-machine';

export async function getProducts() {
  const res = await fetch(`${API}/products`);
  return res.json();
}

export async function selectProduct(productId, quantity = 1) {
  const res = await fetch(`${API}/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity })
  });
  return res.json();
}

export async function insertCoin(transactionId, amount) {
  const res = await fetch(`${API}/${transactionId}/insert-coin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount })
  });
  return res.json();
}

export async function dispense(transactionId) {
  const res = await fetch(`${API}/${transactionId}/dispense`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
}

export async function cancelTransaction(transactionId) {
  const res = await fetch(`${API}/${transactionId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
}
