package com.lld.vendingmachine.exception;

import com.lld.config.DomainException;

/**
 * Base for every vending-machine domain failure. Extends the shared
 * DomainException so GlobalExceptionHandler maps the whole hierarchy to real
 * HTTP statuses instead of the bare 500 an unmapped RuntimeException produces.
 */
public class VendingMachineException extends DomainException {
    public VendingMachineException(String message) {
        super(message);
    }
}
