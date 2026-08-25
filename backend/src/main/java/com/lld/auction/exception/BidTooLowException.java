package com.lld.auction.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** A bid did not reach the minimum the active {@link com.lld.auction.strategy.BidIncrementStrategy} requires. */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class BidTooLowException extends AuctionException {
    public BidTooLowException(long auctionId, double offered, double minRequired) {
        super("Bid " + offered + " on auction " + auctionId + " is too low — minimum acceptable bid is " + minRequired);
    }
}
