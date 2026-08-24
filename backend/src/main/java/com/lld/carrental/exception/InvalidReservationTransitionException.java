package com.lld.carrental.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidReservationTransitionException extends CarRentalException {
    public InvalidReservationTransitionException(String message) {
        super(message);
    }
}
