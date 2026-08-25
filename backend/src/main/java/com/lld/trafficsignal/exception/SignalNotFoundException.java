package com.lld.trafficsignal.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class SignalNotFoundException extends TrafficSignalException {
    public SignalNotFoundException(String message) {
        super(message);
    }
}
