package com.lld.linkedin.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.UNAUTHORIZED)
public class InvalidCredentialsException extends LinkedInException {
    public InvalidCredentialsException(String message) {
        super(message);
    }
}
