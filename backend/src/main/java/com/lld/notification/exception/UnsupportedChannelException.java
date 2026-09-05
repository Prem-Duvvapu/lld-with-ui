package com.lld.notification.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class UnsupportedChannelException extends NotificationException {
    public UnsupportedChannelException(String message) {
        super(message);
    }
}
