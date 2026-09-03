package com.lld.ratelimiter.exception;

import com.lld.config.DomainException;

public class RateLimiterException extends DomainException {
    public RateLimiterException(String message) {
        super(message);
    }
}
