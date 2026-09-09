package com.lld.splitwise.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class UserNotFoundException extends SplitwiseException {
    public UserNotFoundException(long userId) {
        super("Splitwise user not found: " + userId);
    }
}
