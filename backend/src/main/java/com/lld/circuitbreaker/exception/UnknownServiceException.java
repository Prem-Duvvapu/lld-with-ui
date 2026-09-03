package com.lld.circuitbreaker.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** No circuit breaker is registered under the requested service name. */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class UnknownServiceException extends CircuitBreakerException {
    public UnknownServiceException(String message) {
        super(message);
    }
}
