package com.lld.restaurant.exception;

import com.lld.config.DomainException;

/**
 * Base for every Restaurant domain failure. Extends DomainException so
 * GlobalExceptionHandler maps the whole hierarchy to real HTTP statuses.
 */
public class RestaurantException extends DomainException {
    public RestaurantException(String message) {
        super(message);
    }
}
