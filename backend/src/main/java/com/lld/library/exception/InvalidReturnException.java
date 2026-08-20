package com.lld.library.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidReturnException extends LibraryException {
    public InvalidReturnException(String message) {
        super(message);
    }
}
