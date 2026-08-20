package com.lld.linkedin.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class JobNotFoundException extends LinkedInException {
    public JobNotFoundException(String message) {
        super(message);
    }
}
