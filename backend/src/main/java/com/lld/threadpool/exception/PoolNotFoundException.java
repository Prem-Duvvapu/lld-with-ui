package com.lld.threadpool.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class PoolNotFoundException extends ThreadPoolException {
    public PoolNotFoundException(String message) {
        super(message);
    }
}
