const API = '/api/atm';

export async function authenticate(cardNumber, pin) {
  const res = await fetch(`${API}/authenticate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardNumber, pin })
  });
  return res.json();
}

export async function getBalance(accountNumber) {
  const res = await fetch(`${API}/${accountNumber}/balance`);
  return res.json();
}

export async function withdraw(accountNumber, amount) {
  const res = await fetch(`${API}/${accountNumber}/withdraw`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount })
  });
  return res.json();
}

export async function deposit(accountNumber, amount) {
  const res = await fetch(`${API}/${accountNumber}/deposit`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount })
  });
  return res.json();
}

export async function getTransactions(accountNumber) {
  const res = await fetch(`${API}/${accountNumber}/transactions`);
  return res.json();
}
