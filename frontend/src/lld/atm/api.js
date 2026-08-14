import { apiFetch } from '../../utils/api';

export function insertCard(cardNumber) {
  return apiFetch('/atm/insert-card', {
    method: 'POST',
    body: JSON.stringify({ cardNumber }),
  });
}

export function authenticate(cardNumber, pin) {
  return apiFetch('/atm/authenticate', {
    method: 'POST',
    body: JSON.stringify({ cardNumber, pin }),
  });
}

export function getBalance(accountNumber) {
  return apiFetch(`/atm/${accountNumber}/balance`);
}

export function withdraw(accountNumber, amount) {
  return apiFetch(`/atm/${accountNumber}/withdraw`, {
    method: 'POST',
    body: JSON.stringify({ amount: Number(amount) }),
  });
}

export function deposit(accountNumber, amount) {
  return apiFetch(`/atm/${accountNumber}/deposit`, {
    method: 'POST',
    body: JSON.stringify({ amount: Number(amount) }),
  });
}

export function ejectCard() {
  return apiFetch('/atm/eject', { method: 'POST' });
}

export function getTransactions(accountNumber) {
  return apiFetch(`/atm/${accountNumber}/transactions`);
}

export function getDispenserStatus() {
  return apiFetch('/atm/dispenser');
}

// Isolated Simulation API
export function simReset() {
  return apiFetch('/atm/sim/reset', { method: 'POST' });
}

export function simAuthenticate(cardNumber, pin) {
  return apiFetch('/atm/sim/authenticate', {
    method: 'POST',
    body: JSON.stringify({ cardNumber, pin }),
  });
}

export function simWithdraw(accountNumber, amount) {
  return apiFetch('/atm/sim/withdraw', {
    method: 'POST',
    body: JSON.stringify({ accountNumber, amount: Number(amount) }),
  });
}

export function simGetEvents() {
  return apiFetch('/atm/sim/events');
}

export function simGetSnapshots() {
  return apiFetch('/atm/sim/snapshots');
}
