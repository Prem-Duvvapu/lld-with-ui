package com.lld.courseregistration.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class ScheduleConflictException extends CourseRegistrationException {
    public ScheduleConflictException(String message) {
        super(message);
    }
}
