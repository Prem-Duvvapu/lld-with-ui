import { apiFetch } from '../../utils/api';

const BASE_URL = '/api/library';

// Catalog & Books
export function getBooks() {
  return apiFetch(`${BASE_URL}/books`);
}

export function searchBooks(query) {
  const q = encodeURIComponent(query || '');
  return apiFetch(`${BASE_URL}/books/search?query=${q}`);
}

export function addBook(bookData) {
  return apiFetch(`${BASE_URL}/books`, {
    method: 'POST',
    body: JSON.stringify(bookData),
  });
}

export function addCopy(isbn, rackLocation) {
  return apiFetch(`${BASE_URL}/books/${isbn}/copies`, {
    method: 'POST',
    body: JSON.stringify({ rackLocation }),
  });
}

// Members
export function getMembers() {
  return apiFetch(`${BASE_URL}/members`);
}

export function getMember(memberId) {
  return apiFetch(`${BASE_URL}/members/${memberId}`);
}

export function registerMember(name, email, type) {
  return apiFetch(`${BASE_URL}/members`, {
    method: 'POST',
    body: JSON.stringify({ name, email, type }),
  });
}

export function payFine(memberId, amount) {
  return apiFetch(`${BASE_URL}/members/${memberId}/pay-fine`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

// Borrow & Return
export function borrowBook(memberId, isbn) {
  return apiFetch(`${BASE_URL}/borrow`, {
    method: 'POST',
    body: JSON.stringify({ memberId, isbn }),
  });
}

export function returnBook(loanId) {
  return apiFetch(`${BASE_URL}/return/${loanId}`, {
    method: 'POST',
  });
}

export function getActiveLoans(memberId) {
  return apiFetch(`${BASE_URL}/members/${memberId}/loans/active`);
}

export function getLoanHistory(memberId) {
  return apiFetch(`${BASE_URL}/members/${memberId}/loans/history`);
}

export function getNotifications(memberId) {
  return apiFetch(`${BASE_URL}/members/${memberId}/notifications`);
}

// Simulation Endpoints
export function simReset() {
  return apiFetch(`${BASE_URL}/sim/reset`, { method: 'POST' });
}

export function simBorrow(memberId, isbn) {
  return apiFetch(`${BASE_URL}/sim/borrow`, {
    method: 'POST',
    body: JSON.stringify({ memberId, isbn }),
  });
}

export function simReturn(loanId) {
  return apiFetch(`${BASE_URL}/sim/return/${loanId}`, {
    method: 'POST',
  });
}

export function simSweep(makeOverdue = false) {
  return apiFetch(`${BASE_URL}/sim/sweep`, {
    method: 'POST',
    body: JSON.stringify({ makeOverdue }),
  });
}

export function simGetSnapshots() {
  return apiFetch(`${BASE_URL}/sim/snapshots`);
}

export function simGetEvents() {
  return apiFetch(`${BASE_URL}/sim/events`);
}
