package com.lld.stockbroker.exception;

import com.lld.config.DomainException;

public class StockBrokerException extends DomainException {
    public StockBrokerException(String message) {
        super(message);
    }
}
