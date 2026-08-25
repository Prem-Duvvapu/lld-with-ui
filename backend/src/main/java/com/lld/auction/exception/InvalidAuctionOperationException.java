package com.lld.auction.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Malformed input that isn't specifically a window or bid-amount problem: a blank item name,
 *  a non-positive starting bid or increment value, an unknown increment policy, and the like. */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidAuctionOperationException extends AuctionException {
    public InvalidAuctionOperationException(String message) {
        super(message);
    }
}
