package com.lld.hotel.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidDateRangeException extends HotelException {
    public InvalidDateRangeException(String message) {
        super(message);
    }
}
