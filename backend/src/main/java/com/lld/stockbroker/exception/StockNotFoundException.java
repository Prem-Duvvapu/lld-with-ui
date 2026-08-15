package com.lld.stockbroker.exception;

public class StockNotFoundException extends StockBrokerException {
    public StockNotFoundException(String message) {
        super(message);
    }
}
