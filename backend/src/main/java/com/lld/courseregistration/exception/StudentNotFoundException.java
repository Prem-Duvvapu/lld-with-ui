package com.lld.courseregistration.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class StudentNotFoundException extends CourseRegistrationException {
    public StudentNotFoundException(String message) {
        super(message);
    }
}
