package com.lld.hotel.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class InvalidReservationTransitionException extends HotelException {
    public InvalidReservationTransitionException(String message) {
        super(message);
    }
}
