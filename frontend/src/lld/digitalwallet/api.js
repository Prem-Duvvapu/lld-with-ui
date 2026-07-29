const API = '/api/wallet';

export async function createWallet(userId, userName) {
  const res = await fetch(`${API}/create`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userName })
  });
  return res.json();
}

export async function getAllWallets() {
  const res = await fetch(`${API}`);
  return res.json();
}

export async function getWallet(walletId) {
  const res = await fetch(`${API}/${walletId}`);
  return res.json();
}

export async function getBalance(walletId) {
  const res = await fetch(`${API}/${walletId}/balance`);
  return res.json();
}

export async function addFunds(walletId, amount, paymentMethod) {
  const res = await fetch(`${API}/${walletId}/add-funds`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, paymentMethod })
  });
  return res.json();
}

export async function sendMoney(fromWalletId, toWalletId, amount, description) {
  const res = await fetch(`${API}/send`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromWalletId, toWalletId, amount, description })
  });
  return res.json();
}

export async function getTransactions(walletId) {
  const res = await fetch(`${API}/${walletId}/transactions`);
  return res.json();
}