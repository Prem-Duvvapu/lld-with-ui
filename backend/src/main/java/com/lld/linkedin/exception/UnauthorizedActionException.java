package com.lld.linkedin.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class UnauthorizedActionException extends LinkedInException {
    public UnauthorizedActionException(String message) {
        super(message);
    }
}
