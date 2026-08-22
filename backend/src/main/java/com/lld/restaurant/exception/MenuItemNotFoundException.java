package com.lld.restaurant.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class MenuItemNotFoundException extends RestaurantException {
    public MenuItemNotFoundException(String message) {
        super(message);
    }
}
