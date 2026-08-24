package com.lld.inventory.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** An OUTBOUND/TRANSFER movement would take stock below zero — the caller lost the race or asked for too much. */
@ResponseStatus(HttpStatus.CONFLICT)
public class InsufficientStockException extends InventoryException {
    public InsufficientStockException(String sku, int requested, int available) {
        super("Insufficient stock for " + sku + ": requested " + requested + ", available " + available);
    }
}
