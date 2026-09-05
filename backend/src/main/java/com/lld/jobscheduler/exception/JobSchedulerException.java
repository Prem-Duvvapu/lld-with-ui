package com.lld.jobscheduler.exception;

import com.lld.config.DomainException;

/**
 * Base for every Job Scheduler domain failure. Extends the shared {@code DomainException} so
 * {@code GlobalExceptionHandler} maps the whole hierarchy to a real HTTP status.
 */
public class JobSchedulerException extends DomainException {
    public JobSchedulerException(String message) {
        super(message);
    }
}
