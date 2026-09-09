package com.lld.logging.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidLoggingRequestException extends LoggingException {
    public InvalidLoggingRequestException(String message) {
        super(message);
    }
}
