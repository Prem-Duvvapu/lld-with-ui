package com.lld.parkinglot.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Thrown when a request references a parking spot id that does not exist in the repository. */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class SpotNotFoundException extends ParkingLotException {
    public SpotNotFoundException(String spotId) {
        super("No parking spot with id " + spotId);
    }
}
