package com.lld.stockbroker.exception;

public class InsufficientStockException extends StockBrokerException {
    public InsufficientStockException(String message) {
        super(message);
    }
}
