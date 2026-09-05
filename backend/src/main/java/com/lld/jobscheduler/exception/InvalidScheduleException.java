package com.lld.jobscheduler.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidScheduleException extends JobSchedulerException {
    public InvalidScheduleException(String message) {
        super(message);
    }
}
