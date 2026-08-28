package com.lld.pubsub.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a request references a subscriber id that is not currently registered on the
 * given topic — an unsubscribe/direct-send/message-history lookup for an unknown or already
 * departed subscriber.
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class SubscriberNotFoundException extends PubSubException {
    public SubscriberNotFoundException(String message) {
        super(message);
    }
}
