import { apiFetch } from '../../utils/api';

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
    body: JSON.stringify({ amount }),
  });
}

export function deposit(accountNumber, amount) {
  return apiFetch(`/atm/${accountNumber}/deposit`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

export function getTransactions(accountNumber) {
  return apiFetch(`/atm/${accountNumber}/transactions`);
}
