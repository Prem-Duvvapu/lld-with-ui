package com.lld.restaurant.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class TableUnavailableException extends RestaurantException {
    public TableUnavailableException(String message) {
        super(message);
    }
}
