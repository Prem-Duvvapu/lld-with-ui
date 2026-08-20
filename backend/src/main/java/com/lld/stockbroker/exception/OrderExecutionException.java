package com.lld.stockbroker.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
public class OrderExecutionException extends StockBrokerException {
    public OrderExecutionException(String message) {
        super(message);
    }
}
