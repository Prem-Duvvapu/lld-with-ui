package com.lld.restaurant.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class InvalidOrderTransitionException extends RestaurantException {
    public InvalidOrderTransitionException(String message) {
        super(message);
    }
}
