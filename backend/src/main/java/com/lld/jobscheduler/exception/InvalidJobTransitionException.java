package com.lld.jobscheduler.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown by {@code Job.transition()} when the requested move is not in the current status's
 * allowed-next set (mirrors {@code uber.exception.InvalidRideTransitionException}) — e.g.
 * cancelling a job that already reached a terminal {@code COMPLETED}.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidJobTransitionException extends JobSchedulerException {
    public InvalidJobTransitionException(String message) {
        super(message);
    }
}
