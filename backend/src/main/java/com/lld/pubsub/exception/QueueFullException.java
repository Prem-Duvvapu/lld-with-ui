package com.lld.pubsub.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown by a strict, single-subscriber send ({@code PubSubService#publishToSubscriber}) when
 * that subscriber's bounded {@code ArrayBlockingQueue} is already at capacity. The broadcast
 * {@code publish()} path never throws this — a full queue there is reported back to the caller
 * as a rejected-subscriber id so one slow consumer can never fail delivery to the rest of the
 * topic's subscribers. See {@code SubscriberWorker#enqueueOrThrow}.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class QueueFullException extends PubSubException {
    public QueueFullException(String message) {
        super(message);
    }
}
