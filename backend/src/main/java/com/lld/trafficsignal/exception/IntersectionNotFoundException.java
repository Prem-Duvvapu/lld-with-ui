package com.lld.trafficsignal.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class IntersectionNotFoundException extends TrafficSignalException {
    public IntersectionNotFoundException(String message) {
        super(message);
    }
}
