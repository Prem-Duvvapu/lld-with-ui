package com.lld.linkedin.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class ConnectionException extends LinkedInException {
    public ConnectionException(String message) {
        super(message);
    }
}
