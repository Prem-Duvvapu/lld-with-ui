import { apiFetch } from '../../utils/api';

// ------------------------------------------------------------------- live

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

export function withdraw(walletId, amount, description) {
  return apiFetch(`/wallet/${walletId}/withdraw`, {
    method: 'POST',
    body: JSON.stringify({ amount, description })
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

export function getCommandLog() {
  return apiFetch('/wallet/command-log');
}

// -------------------------------------------------------------------- sim

export function simReset() {
  return apiFetch('/wallet/sim/reset', { method: 'POST' });
}

export function simState() {
  return apiFetch('/wallet/sim/state');
}

export function simCredit(walletId, amount, paymentMethod, step) {
  return apiFetch('/wallet/sim/credit', {
    method: 'POST',
    body: JSON.stringify({ walletId, amount, paymentMethod, step })
  });
}

export function simDebit(walletId, amount, step) {
  return apiFetch('/wallet/sim/debit', {
    method: 'POST',
    body: JSON.stringify({ walletId, amount, step })
  });
}

export function simTransfer(fromWalletId, toWalletId, amount, description, step) {
  return apiFetch('/wallet/sim/transfer', {
    method: 'POST',
    body: JSON.stringify({ fromWalletId, toWalletId, amount, description, step })
  });
}

export function simRace(walletAId, walletBId, transfers, amountEach, step) {
  return apiFetch('/wallet/sim/race', {
    method: 'POST',
    body: JSON.stringify({ walletAId, walletBId, transfers, amountEach, step })
  });
}

export function simEvents() {
  return apiFetch('/wallet/sim/events');
}
