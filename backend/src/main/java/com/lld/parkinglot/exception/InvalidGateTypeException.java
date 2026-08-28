package com.lld.parkinglot.exception;

import com.lld.parkinglot.model.Gate;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Thrown when a vehicle tries to enter through an EXIT gate, or exit through an ENTRY gate. */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidGateTypeException extends ParkingLotException {
    public InvalidGateTypeException(String gateId, Gate.GateType expected) {
        super("Gate " + gateId + " is not an " + expected + " gate");
    }
}
