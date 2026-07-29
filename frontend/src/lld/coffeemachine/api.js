const API = '/api/coffee-machine';

export async function getMenu() {
  const res = await fetch(`${API}/menu`);
  return res.json();
}

export async function getStatus() {
  const res = await fetch(`${API}/status`);
  return res.json();
}

export async function selectBeverage(beverageId) {
  const res = await fetch(`${API}/select`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ beverageId })
  });
  return res.json();
}

export async function brew(beverageId) {
  const res = await fetch(`${API}/brew`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ beverageId })
  });
  return res.json();
}

export async function refillIngredient(ingredient, amount) {
  const res = await fetch(`${API}/refill`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredient, amount })
  });
  return res.json();
}

export async function resetMachine() {
  const res = await fetch(`${API}/reset`, { method: 'POST' });
  return res.json();
}

export async function getOrders() {
  const res = await fetch(`${API}/orders`);
  return res.json();
}