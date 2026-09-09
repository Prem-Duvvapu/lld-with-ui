package com.lld.logging.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class AppenderNotFoundException extends LoggingException {
    public AppenderNotFoundException(String value) {
        super("Log appender not found: " + value);
    }
}
