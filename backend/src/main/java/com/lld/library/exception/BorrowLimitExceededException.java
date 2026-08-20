package com.lld.library.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class BorrowLimitExceededException extends LibraryException {
    public BorrowLimitExceededException(String message) {
        super(message);
    }
}
