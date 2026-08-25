package com.lld.auction.strategy;

import com.lld.auction.model.Auction;

/**
 * One bid-validation / auto-increment algorithm. The service calls only this interface — it
 * never branches on {@link BidIncrementPolicy} itself, so adding a policy is one new
 * implementation plus one factory entry (the same shape as inventory's {@code ReorderStrategy}).
 */
public interface BidIncrementStrategy {

    /** Human-readable name surfaced in the UI and audit events. */
    String name();

    /**
     * The minimum amount a new bid must reach to supersede {@code auction}'s current bid.
     * Called with the lock for that auction already held, so {@code auction.getCurrentBid()}
     * reflects the latest accepted bid, not a stale read.
     */
    double minNextBid(Auction auction);
}
