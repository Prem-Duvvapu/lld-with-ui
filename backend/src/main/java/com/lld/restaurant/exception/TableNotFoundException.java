package com.lld.restaurant.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class TableNotFoundException extends RestaurantException {
    public TableNotFoundException(String message) {
        super(message);
    }
}
