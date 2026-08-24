package com.lld.zomato.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class DeliveryAgentNotFoundException extends ZomatoException {
    public DeliveryAgentNotFoundException(String message) {
        super(message);
    }
}
