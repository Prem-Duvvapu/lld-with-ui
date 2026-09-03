package com.lld.ratelimiter.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidRateLimitConfigException extends RateLimiterException {
    public InvalidRateLimitConfigException(String message) {
        super(message);
    }
}
