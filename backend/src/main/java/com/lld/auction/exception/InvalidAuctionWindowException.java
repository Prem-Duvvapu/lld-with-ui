package com.lld.auction.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** A bid arrived before the auction's scheduled start, or the auction was created with an
 *  invalid start/end/duration window. */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidAuctionWindowException extends AuctionException {
    public InvalidAuctionWindowException(String message) {
        super(message);
    }
}
