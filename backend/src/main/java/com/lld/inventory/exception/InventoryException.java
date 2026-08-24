package com.lld.inventory.exception;

import com.lld.config.DomainException;

/**
 * Base exception for the inventory module. No status of its own — every concrete
 * subclass carries the HTTP status; this class exists so callers can catch the
 * whole module hierarchy and so {@code GlobalExceptionHandler} can recognise it.
 */
public abstract class InventoryException extends DomainException {
    protected InventoryException(String message) {
        super(message);
    }
}
