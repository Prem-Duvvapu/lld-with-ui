package com.lld.threadpool.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Thrown by {@code AbortPolicy} when the pool is fully saturated — core+extra workers all busy
 *  and the queue is full. 429, not 5xx: the pool is doing exactly what it's configured to do. */
@ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
public class TaskRejectedException extends ThreadPoolException {
    public TaskRejectedException(String message) {
        super(message);
    }
}
