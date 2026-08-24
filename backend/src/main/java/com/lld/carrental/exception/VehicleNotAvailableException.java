package com.lld.carrental.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** The vehicle is out of the fleet (maintenance/retired), or its dates overlap an existing reservation. */
@ResponseStatus(HttpStatus.CONFLICT)
public class VehicleNotAvailableException extends CarRentalException {
    public VehicleNotAvailableException(String message) {
        super(message);
    }
}
