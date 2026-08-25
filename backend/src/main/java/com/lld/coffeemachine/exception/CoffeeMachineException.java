package com.lld.coffeemachine.exception;

import com.lld.config.DomainException;

/**
 * Base for every coffee-machine domain failure. Extends the shared
 * DomainException so GlobalExceptionHandler maps the whole hierarchy to real
 * HTTP statuses instead of the bare 500 an unmapped RuntimeException produces.
 */
public class CoffeeMachineException extends DomainException {
    public CoffeeMachineException(String message) {
        super(message);
    }
}
