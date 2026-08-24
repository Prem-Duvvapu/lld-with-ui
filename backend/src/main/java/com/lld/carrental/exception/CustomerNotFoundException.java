package com.lld.carrental.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class CustomerNotFoundException extends CarRentalException {
    public CustomerNotFoundException(String message) {
        super(message);
    }
}
