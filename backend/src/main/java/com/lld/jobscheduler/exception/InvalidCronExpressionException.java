package com.lld.jobscheduler.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidCronExpressionException extends JobSchedulerException {
    public InvalidCronExpressionException(String message) {
        super(message);
    }
}
