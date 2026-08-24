package com.lld.courseregistration.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidDropException extends CourseRegistrationException {
    public InvalidDropException(String message) {
        super(message);
    }
}
