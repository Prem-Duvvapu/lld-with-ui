package com.lld.shoppingcart.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
public class PaymentFailedException extends ShoppingCartException {
    public PaymentFailedException(String message) {
        super(message);
    }
}
