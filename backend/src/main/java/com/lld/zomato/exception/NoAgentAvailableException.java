package com.lld.zomato.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class NoAgentAvailableException extends ZomatoException {
    public NoAgentAvailableException(String message) {
        super(message);
    }
}
