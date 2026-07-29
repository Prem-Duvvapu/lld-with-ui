const API = '/api/library';

export async function searchBooks(q) {
  const params = q ? `?q=${encodeURIComponent(q)}` : '';
  const res = await fetch(`${API}/books/search${params}`);
  return res.json();
}

export async function getAvailableBooks() {
  const res = await fetch(`${API}/books/available`);
  return res.json();
}

export async function borrowBook(memberId, bookId) {
  const res = await fetch(`${API}/borrow`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, bookId })
  });
  return res.json();
}

export async function returnBook(recordId) {
  const res = await fetch(`${API}/return`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recordId })
  });
  return res.json();
}

export async function getMemberHistory(memberId) {
  const res = await fetch(`${API}/members/${memberId}/history`);
  return res.json();
}

export async function getMembers() {
  const res = await fetch(`${API}/members`);
  return res.json();
}
