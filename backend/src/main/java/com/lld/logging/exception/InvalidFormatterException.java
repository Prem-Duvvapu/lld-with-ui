package com.lld.logging.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidFormatterException extends LoggingException {
    public InvalidFormatterException(String value) {
        super("Unsupported log formatter: " + value);
    }
}
