package com.lld.parkinglot.exception;

import com.lld.config.DomainException;

/** Base of the parking-lot domain exception hierarchy. Never thrown directly. */
public abstract class ParkingLotException extends DomainException {
    protected ParkingLotException(String message) {
        super(message);
    }
}
