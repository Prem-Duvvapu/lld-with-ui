package com.lld.hotel.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class RoomNotFoundException extends HotelException {
    public RoomNotFoundException(String message) {
        super(message);
    }
}
