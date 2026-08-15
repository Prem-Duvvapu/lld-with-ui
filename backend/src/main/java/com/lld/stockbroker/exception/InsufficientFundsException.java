package com.lld.stockbroker.exception;

public class InsufficientFundsException extends StockBrokerException {
    public InsufficientFundsException(String message) {
        super(message);
    }
}
