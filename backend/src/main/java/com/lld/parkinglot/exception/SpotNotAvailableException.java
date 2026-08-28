package com.lld.parkinglot.exception;

import com.lld.parkinglot.model.VehicleType;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Thrown when every spot for the requested {@link VehicleType} is occupied. */
@ResponseStatus(HttpStatus.CONFLICT)
public class SpotNotAvailableException extends ParkingLotException {
    public SpotNotAvailableException(VehicleType vehicleType) {
        super("No available spot for vehicle type: " + vehicleType);
    }
}
