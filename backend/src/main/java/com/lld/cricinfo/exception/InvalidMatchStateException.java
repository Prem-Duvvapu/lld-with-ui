package com.lld.cricinfo.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Thrown when an operation is attempted from a MatchStatus that doesn't allow it. */
@ResponseStatus(HttpStatus.CONFLICT)
public class InvalidMatchStateException extends CricinfoException {
    public InvalidMatchStateException(String message) {
        super(message);
    }
}
