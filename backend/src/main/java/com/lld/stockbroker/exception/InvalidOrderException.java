package com.lld.stockbroker.exception;

public class InvalidOrderException extends StockBrokerException {
    public InvalidOrderException(String message) {
        super(message);
    }
}
