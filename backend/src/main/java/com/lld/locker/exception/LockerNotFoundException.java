package com.lld.locker.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class LockerNotFoundException extends LockerException {
    public LockerNotFoundException(String message) {
        super(message);
    }
}
