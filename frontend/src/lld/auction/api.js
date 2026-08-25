import { apiFetch } from '../../utils/api';

// ------------------------------------------------------------------- live

export function createAuction(itemName, description, startingBid, durationMinutes, options = {}) {
  const { startDelayMinutes, incrementPolicy, incrementValue } = options;
  return apiFetch('/auction/auctions', {
    method: 'POST',
    body: JSON.stringify({
      itemName, description, startingBid, durationMinutes,
      ...(startDelayMinutes != null ? { startDelayMinutes } : {}),
      ...(incrementPolicy ? { incrementPolicy } : {}),
      ...(incrementValue != null ? { incrementValue } : {}),
    }),
  });
}

export function getAllAuctions() {
  return apiFetch('/auction/auctions');
}

export function getAuction(id) {
  return apiFetch(`/auction/auctions/${id}`);
}

export function registerBidder(name, email) {
  return apiFetch('/auction/bidders', {
    method: 'POST',
    body: JSON.stringify({ name, email }),
  });
}

export function getAllBidders() {
  return apiFetch('/auction/bidders');
}

export function placeBid(auctionId, bidderId, amount) {
  return apiFetch('/auction/bids', {
    method: 'POST',
    body: JSON.stringify({ auctionId, bidderId, amount }),
  });
}

export function getBidsForAuction(auctionId) {
  return apiFetch(`/auction/auctions/${auctionId}/bids`);
}

export function closeAuction(auctionId) {
  return apiFetch(`/auction/auctions/${auctionId}/close`, { method: 'POST' });
}

export function getNotifications() {
  return apiFetch('/auction/notifications');
}

// -------------------------------------------------------------------- sim

export function simReset() {
  return apiFetch('/auction/sim/reset', { method: 'POST' });
}

export function simSnapshot() {
  return apiFetch('/auction/sim/snapshot');
}

export function simPlaceBid(auctionId, bidderId, amount, step) {
  return apiFetch('/auction/sim/bid', {
    method: 'POST',
    body: JSON.stringify({ auctionId, bidderId, amount, step }),
  });
}

export function simClose(auctionId, step) {
  return apiFetch('/auction/sim/close', {
    method: 'POST',
    body: JSON.stringify({ auctionId, step }),
  });
}

export function simRace(auctionId, bidderCount, step) {
  return apiFetch('/auction/sim/race', {
    method: 'POST',
    body: JSON.stringify({ auctionId, bidderCount, step }),
  });
}

export function simGetEvents() {
  return apiFetch('/auction/sim/events');
}
