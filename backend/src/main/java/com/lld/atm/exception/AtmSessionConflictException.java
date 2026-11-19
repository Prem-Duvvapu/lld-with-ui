package com.lld.atm.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class AtmSessionConflictException extends AtmException {
    public AtmSessionConflictException(String message) { super(message); }
}
