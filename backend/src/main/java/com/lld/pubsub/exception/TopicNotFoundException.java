package com.lld.pubsub.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Thrown when a request references a topic name that has never been created. */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class TopicNotFoundException extends PubSubException {
    public TopicNotFoundException(String message) {
        super(message);
    }
}
