package com.lld.inventory.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class ProductNotFoundException extends InventoryException {
    public ProductNotFoundException(long productId) {
        super("Product not found: " + productId);
    }
}
