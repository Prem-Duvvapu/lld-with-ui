package com.lld.courseregistration.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class RegistrationNotFoundException extends CourseRegistrationException {
    public RegistrationNotFoundException(String message) {
        super(message);
    }
}
