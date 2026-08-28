package com.lld.parkinglot.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Thrown when a request references a gate id that does not exist in the repository. */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class GateNotFoundException extends ParkingLotException {
    public GateNotFoundException(String gateId) {
        super("No gate with id " + gateId);
    }
}
