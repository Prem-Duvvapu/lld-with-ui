package com.lld.threadpool.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidPoolConfigException extends ThreadPoolException {
    public InvalidPoolConfigException(String message) {
        super(message);
    }
}
