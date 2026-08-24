package com.lld.stackoverflow.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class UserNotFoundException extends StackOverflowException {
    public UserNotFoundException(String message) {
        super(message);
    }
}
