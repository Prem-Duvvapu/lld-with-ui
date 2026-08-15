package com.lld.stockbroker.exception;

public class AccountNotFoundException extends StockBrokerException {
    public AccountNotFoundException(String message) {
        super(message);
    }
}
