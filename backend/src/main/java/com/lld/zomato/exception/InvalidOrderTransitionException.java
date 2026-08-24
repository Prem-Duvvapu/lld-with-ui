package com.lld.zomato.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class InvalidOrderTransitionException extends ZomatoException {
    public InvalidOrderTransitionException(String message) {
        super(message);
    }
}
