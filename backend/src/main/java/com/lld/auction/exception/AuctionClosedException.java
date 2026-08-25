package com.lld.auction.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** The auction has already ended (or was closed early) — bids are no longer accepted. */
@ResponseStatus(HttpStatus.CONFLICT)
public class AuctionClosedException extends AuctionException {
    public AuctionClosedException(String message) {
        super(message);
    }
}
