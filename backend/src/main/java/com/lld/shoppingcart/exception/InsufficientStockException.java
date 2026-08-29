package com.lld.shoppingcart.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class InsufficientStockException extends ShoppingCartException {
    public InsufficientStockException(String message) {
        super(message);
    }
}
