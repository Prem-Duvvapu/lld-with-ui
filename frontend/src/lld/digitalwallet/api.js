import { apiFetch } from '../../utils/api';

export function createWallet(userId, userName) {
  return apiFetch('/wallet/create', {
    method: 'POST',
    body: JSON.stringify({ userId, userName })
  });
}

export function getAllWallets() {
  return apiFetch('/wallet');
}

export function getWallet(walletId) {
  return apiFetch(`/wallet/${walletId}`);
}

export function getBalance(walletId) {
  return apiFetch(`/wallet/${walletId}/balance`);
}

export function addFunds(walletId, amount, paymentMethod) {
  return apiFetch(`/wallet/${walletId}/add-funds`, {
    method: 'POST',
    body: JSON.stringify({ amount, paymentMethod })
  });
}

export function sendMoney(fromWalletId, toWalletId, amount, description) {
  return apiFetch('/wallet/send', {
    method: 'POST',
    body: JSON.stringify({ fromWalletId, toWalletId, amount, description })
  });
}

export function getTransactions(walletId) {
  return apiFetch(`/wallet/${walletId}/transactions`);
}