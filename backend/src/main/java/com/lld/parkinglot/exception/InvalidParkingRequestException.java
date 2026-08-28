package com.lld.parkinglot.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Thrown for a malformed request — a null body, a missing vehicle type, and the like. */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidParkingRequestException extends ParkingLotException {
    public InvalidParkingRequestException(String message) {
        super(message);
    }
}
