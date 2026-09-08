package com.lld.blackjack.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** 409, not 400 — the request was well-formed, the shared shoe simply ran out mid-deal. */
@ResponseStatus(HttpStatus.CONFLICT)
public class ShoeExhaustedException extends BlackjackException {
    public ShoeExhaustedException(String message) {
        super(message);
    }
}
