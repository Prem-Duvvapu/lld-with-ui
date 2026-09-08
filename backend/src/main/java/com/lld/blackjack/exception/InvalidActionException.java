package com.lld.blackjack.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidActionException extends BlackjackException {
    public InvalidActionException(String message) {
        super(message);
    }
}
