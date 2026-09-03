package com.lld.ratelimiter.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class ClientNotFoundException extends RateLimiterException {
    public ClientNotFoundException(String message) {
        super(message);
    }
}
