package com.lld.zomato.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class MenuItemNotFoundException extends ZomatoException {
    public MenuItemNotFoundException(String message) {
        super(message);
    }
}
