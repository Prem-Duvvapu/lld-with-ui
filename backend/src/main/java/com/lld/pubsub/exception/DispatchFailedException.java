package com.lld.pubsub.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown by a strict, single-subscriber send when the target subscriber's dedicated worker
 * thread has already stopped (unsubscribed or shut down) and can no longer accept anything into
 * its queue — distinct from {@link QueueFullException}, where the worker is alive but its queue
 * is momentarily saturated. 410 (GONE) rather than 5xx: the subscriber that would have received
 * this message is simply no longer part of the topic, which is the caller's stale state, not a
 * broker fault.
 */
@ResponseStatus(HttpStatus.GONE)
public class DispatchFailedException extends PubSubException {
    public DispatchFailedException(String message) {
        super(message);
    }
}
