package com.lld.shoppingcart.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidOrderStateException extends ShoppingCartException {
    public InvalidOrderStateException(String message) {
        super(message);
    }
}
