package com.lld.parkinglot.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Thrown when the requested vehicle type string does not match a known {@code VehicleType}. */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class VehicleTypeNotSupportedException extends ParkingLotException {
    public VehicleTypeNotSupportedException(String vehicleType) {
        super("Unknown vehicle type: " + vehicleType);
    }
}
