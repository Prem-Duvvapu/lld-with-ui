package com.lld.auction.strategy;

/** The auto-increment policies a seller can pick when creating an auction; resolved to a
 *  {@link BidIncrementStrategy} by {@link BidIncrementStrategyFactory}. */
public enum BidIncrementPolicy {
    /** Next bid must exceed the current bid by a fixed currency amount ({@code incrementValue}). */
    FIXED,
    /** Next bid must exceed the current bid by a percentage of it ({@code incrementValue} as a whole percent, e.g. 5 = 5%). */
    PERCENTAGE
}
