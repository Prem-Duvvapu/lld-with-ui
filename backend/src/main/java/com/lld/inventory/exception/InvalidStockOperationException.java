package com.lld.inventory.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Malformed stock operation: non-positive quantity, unknown movement type, or a no-op reorder. */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidStockOperationException extends InventoryException {
    public InvalidStockOperationException(String message) {
        super(message);
    }
}
