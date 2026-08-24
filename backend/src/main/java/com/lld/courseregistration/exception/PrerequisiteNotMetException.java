package com.lld.courseregistration.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class PrerequisiteNotMetException extends CourseRegistrationException {
    public PrerequisiteNotMetException(String message) {
        super(message);
    }
}
