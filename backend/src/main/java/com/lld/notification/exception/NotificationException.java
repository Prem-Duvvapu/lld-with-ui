package com.lld.notification.exception;

import com.lld.config.DomainException;

/** Base for every Notification System domain failure. Extends the shared DomainException so
 * GlobalExceptionHandler maps the whole hierarchy to real HTTP statuses. */
public class NotificationException extends DomainException {
    public NotificationException(String message) {
        super(message);
    }
}
