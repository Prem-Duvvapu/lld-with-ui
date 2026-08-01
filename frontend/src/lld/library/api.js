import { apiFetch } from '../../utils/api';

export function searchBooks(q) {
  const params = q ? `?q=${encodeURIComponent(q)}` : '';
  return apiFetch(`/library/books/search${params}`);
}

export function getAvailableBooks() {
  return apiFetch('/library/books/available');
}

export function borrowBook(memberId, bookId) {
  return apiFetch('/library/borrow', {
    method: 'POST',
    body: JSON.stringify({ memberId, bookId })
  });
}

export function returnBook(recordId) {
  return apiFetch('/library/return', {
    method: 'POST',
    body: JSON.stringify({ recordId })
  });
}

export function getMemberHistory(memberId) {
  return apiFetch(`/library/members/${memberId}/history`);
}

export function getMembers() {
  return apiFetch('/library/members');
}
