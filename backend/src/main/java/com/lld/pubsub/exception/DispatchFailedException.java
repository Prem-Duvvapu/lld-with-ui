package com.lld.pubsub.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
public class DispatchFailedException extends RuntimeException {
    public DispatchFailedException(String message) {
        super(message);
    }
}
