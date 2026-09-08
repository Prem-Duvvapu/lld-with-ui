package com.lld.locker.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class LockerBankNotFoundException extends LockerException {
    public LockerBankNotFoundException(String message) {
        super(message);
    }
}
