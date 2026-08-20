package com.lld.library.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class LoanNotFoundException extends LibraryException {
    public LoanNotFoundException(String message) {
        super(message);
    }
}
