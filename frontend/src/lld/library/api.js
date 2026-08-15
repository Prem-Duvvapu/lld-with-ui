const BASE_URL = '/api/library';

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'API request failed');
  }
  return res.json();
}

// Catalog & Books
export async function getBooks() {
  const res = await fetch(`${BASE_URL}/books`);
  return handleResponse(res);
}

export async function searchBooks(query) {
  const q = encodeURIComponent(query || '');
  const res = await fetch(`${BASE_URL}/books/search?query=${q}`);
  return handleResponse(res);
}

export async function addBook(bookData) {
  const res = await fetch(`${BASE_URL}/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookData),
  });
  return handleResponse(res);
}

export async function addCopy(isbn, rackLocation) {
  const res = await fetch(`${BASE_URL}/books/${isbn}/copies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rackLocation }),
  });
  return handleResponse(res);
}

// Members
export async function getMembers() {
  const res = await fetch(`${BASE_URL}/members`);
  return handleResponse(res);
}

export async function getMember(memberId) {
  const res = await fetch(`${BASE_URL}/members/${memberId}`);
  return handleResponse(res);
}

export async function registerMember(name, email, type) {
  const res = await fetch(`${BASE_URL}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, type }),
  });
  return handleResponse(res);
}

export async function payFine(memberId, amount) {
  const res = await fetch(`${BASE_URL}/members/${memberId}/pay-fine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  });
  return handleResponse(res);
}

// Borrow & Return
export async function borrowBook(memberId, isbn) {
  const res = await fetch(`${BASE_URL}/borrow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, isbn }),
  });
  return handleResponse(res);
}

export async function returnBook(loanId) {
  const res = await fetch(`${BASE_URL}/return/${loanId}`, {
    method: 'POST',
  });
  return handleResponse(res);
}

export async function getActiveLoans(memberId) {
  const res = await fetch(`${BASE_URL}/members/${memberId}/loans/active`);
  return handleResponse(res);
}

export async function getLoanHistory(memberId) {
  const res = await fetch(`${BASE_URL}/members/${memberId}/loans/history`);
  return handleResponse(res);
}

export async function getNotifications(memberId) {
  const res = await fetch(`${BASE_URL}/members/${memberId}/notifications`);
  return handleResponse(res);
}

// Simulation Endpoints
export async function simReset() {
  const res = await fetch(`${BASE_URL}/sim/reset`, { method: 'POST' });
  return handleResponse(res);
}

export async function simBorrow(memberId, isbn) {
  const res = await fetch(`${BASE_URL}/sim/borrow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, isbn }),
  });
  return handleResponse(res);
}

export async function simReturn(loanId) {
  const res = await fetch(`${BASE_URL}/sim/return/${loanId}`, {
    method: 'POST',
  });
  return handleResponse(res);
}

export async function simSweep(makeOverdue = false) {
  const res = await fetch(`${BASE_URL}/sim/sweep`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ makeOverdue }),
  });
  return handleResponse(res);
}

export async function simGetSnapshots() {
  const res = await fetch(`${BASE_URL}/sim/snapshots`);
  return handleResponse(res);
}

export async function simGetEvents() {
  const res = await fetch(`${BASE_URL}/sim/events`);
  return handleResponse(res);
}
