const BASE_URL = '/api/auction';

export async function createAuction(itemName, description, startingBid, durationMinutes) {
  const res = await fetch(`${BASE_URL}/auctions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemName, description, startingBid, durationMinutes }),
  });
  return res.json();
}

export async function getAllAuctions() {
  const res = await fetch(`${BASE_URL}/auctions`);
  return res.json();
}

export async function getAuction(id) {
  const res = await fetch(`${BASE_URL}/auctions/${id}`);
  return res.json();
}

export async function registerBidder(name, email) {
  const res = await fetch(`${BASE_URL}/bidders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email }),
  });
  return res.json();
}

export async function getAllBidders() {
  const res = await fetch(`${BASE_URL}/bidders`);
  return res.json();
}

export async function placeBid(auctionId, bidderId, amount) {
  const res = await fetch(`${BASE_URL}/bids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auctionId, bidderId, amount }),
  });
  return res.json();
}

export async function getBidsForAuction(auctionId) {
  const res = await fetch(`${BASE_URL}/auctions/${auctionId}/bids`);
  return res.json();
}

export async function closeAuction(auctionId) {
  const res = await fetch(`${BASE_URL}/auctions/${auctionId}/close`, { method: 'POST' });
  return res.json();
}