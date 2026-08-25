package com.lld.auction.model;

/** Lifecycle state of an {@link Auction}. Transitions are time-driven: PENDING until the start
 *  time arrives, ACTIVE while bids are accepted, CLOSED once the end time passes or a seller
 *  closes it early. {@link com.lld.auction.service.AuctionService} re-derives the effective
 *  state from wall-clock time on every bid rather than trusting only this field, so a background
 *  scheduler tick being late never lets a bid slip through an already-ended window. */
public enum AuctionStatus {
    PENDING, ACTIVE, CLOSED
}
