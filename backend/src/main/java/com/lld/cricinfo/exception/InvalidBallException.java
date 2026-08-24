package com.lld.cricinfo.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Thrown for a ball payload that violates the rules of cricket (e.g. runs off a wide). */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidBallException extends CricinfoException {
    public InvalidBallException(String message) {
        super(message);
    }
}
