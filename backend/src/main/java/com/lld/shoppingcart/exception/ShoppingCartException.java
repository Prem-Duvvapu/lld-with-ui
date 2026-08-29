package com.lld.shoppingcart.exception;

import com.lld.config.DomainException;

/**
 * Base of the shopping-cart domain exception hierarchy, matching {@code com.lld.atm.exception.AtmException}.
 * Never thrown directly — every concrete subclass carries its own {@code @ResponseStatus}, read by
 * {@link com.lld.config.GlobalExceptionHandler} via {@code AnnotationUtils}.
 */
public abstract class ShoppingCartException extends DomainException {
    protected ShoppingCartException(String message) {
        super(message);
    }
}
