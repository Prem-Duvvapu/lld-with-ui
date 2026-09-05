package com.lld.notification.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class NotificationNotFoundException extends NotificationException {
    public NotificationNotFoundException(String message) {
        super(message);
    }
}
