package com.lld.hotel.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class HotelNotFoundException extends HotelException {
    public HotelNotFoundException(String message) {
        super(message);
    }
}
