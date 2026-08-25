package com.lld.auction.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class AuctionNotFoundException extends AuctionException {
    public AuctionNotFoundException(long auctionId) {
        super("Auction not found: " + auctionId);
    }
}
