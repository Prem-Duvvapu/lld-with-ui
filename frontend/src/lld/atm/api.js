import { apiFetch } from '../../utils/api';

export function insertCard(cardNumber, options = {}) {
  return apiFetch('/atm/insert-card', {
    ...options,
    method: 'POST',
    body: JSON.stringify({ cardNumber }),
  });
}

export function authenticate(cardNumber, pin, options = {}) {
  return apiFetch('/atm/authenticate', {
    ...options,
    method: 'POST',
    body: JSON.stringify({ cardNumber, pin }),
  });
}

export function getBalance(accountNumber, options = {}) {
  return apiFetch(`/atm/${accountNumber}/balance`, options);
}

export function withdraw(accountNumber, amount, mode, options = {}) {
  return apiFetch(`/atm/${accountNumber}/withdraw`, {
    ...options,
    method: 'POST',
    body: JSON.stringify({ amount: Number(amount), mode }),
  });
}

export function deposit(accountNumber, amount, options = {}) {
  return apiFetch(`/atm/${accountNumber}/deposit`, {
    ...options,
    method: 'POST',
    body: JSON.stringify({ amount: Number(amount) }),
  });
}

export function ejectCard(options = {}) {
  return apiFetch('/atm/eject', { ...options, method: 'POST' });
}

export function getTransactions(accountNumber, options = {}) {
  return apiFetch(`/atm/${accountNumber}/transactions`, options);
}

export function getDispenserStatus(options = {}) {
  return apiFetch('/atm/dispenser', options);
}

// Isolated Simulation API
export function simReset(options = {}) {
  return apiFetch('/atm/sim/reset', { ...options, method: 'POST' });
}

export function simInsertCard(cardNumber, options = {}) {
  return apiFetch('/atm/sim/insert-card', {
    ...options, method: 'POST', body: JSON.stringify({ cardNumber }),
  });
}

export function simAuthenticate(cardNumber, pin, options = {}) {
  return apiFetch('/atm/sim/authenticate', {
    ...options, method: 'POST', body: JSON.stringify({ cardNumber, pin }),
  });
}

export function simWithdraw(accountNumber, amount, mode, options = {}) {
  return apiFetch('/atm/sim/withdraw', {
    ...options, method: 'POST', body: JSON.stringify({ accountNumber, amount: Number(amount), mode }),
  });
}

export function simEject(options = {}) {
  return apiFetch('/atm/sim/eject', { ...options, method: 'POST' });
}

export function simGetEvents(options = {}) {
  return apiFetch('/atm/sim/events', options);
}

export function simGetSnapshots(options = {}) {
  return apiFetch('/atm/sim/snapshots', options);
}

export function simGetState(options = {}) {
  return apiFetch('/atm/sim/state', options);
}
