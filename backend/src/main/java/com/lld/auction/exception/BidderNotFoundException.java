package com.lld.auction.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class BidderNotFoundException extends AuctionException {
    public BidderNotFoundException(long bidderId) {
        super("Bidder not found: " + bidderId);
    }
}
