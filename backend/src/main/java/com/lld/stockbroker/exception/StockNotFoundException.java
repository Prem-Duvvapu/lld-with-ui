package com.lld.stockbroker.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class StockNotFoundException extends StockBrokerException {
    public StockNotFoundException(String message) {
        super(message);
    }
}
