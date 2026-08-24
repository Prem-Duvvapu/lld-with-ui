package com.lld.carrental.exception;

import com.lld.config.DomainException;

/** Base of the car-rental domain exception hierarchy. Never thrown directly. */
public class CarRentalException extends DomainException {
    public CarRentalException(String message) {
        super(message);
    }
}
