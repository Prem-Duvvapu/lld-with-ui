package com.lld.cricinfo.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Thrown when a ball is recorded against an innings that has already ended. */
@ResponseStatus(HttpStatus.CONFLICT)
public class InningsCompleteException extends CricinfoException {
    public InningsCompleteException(String message) {
        super(message);
    }
}
