package com.lld.zomato.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class MenuItemUnavailableException extends ZomatoException {
    public MenuItemUnavailableException(String message) {
        super(message);
    }
}
