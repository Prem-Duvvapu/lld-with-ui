package com.lld.pubsub.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a subscriber id that is already active on a topic tries to subscribe to that same
 * topic again. Callers that want to change capacity/delay must {@code unsubscribe} first — a
 * deliberate choice over silently replacing the existing worker (which used to happen and would
 * silently drop that worker's in-flight queue and delivered/rejected counters).
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class DuplicateSubscriptionException extends PubSubException {
    public DuplicateSubscriptionException(String message) {
        super(message);
    }
}
