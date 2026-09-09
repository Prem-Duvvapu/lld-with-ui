package com.lld.splitwise.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidSettlementException extends SplitwiseException {
    public InvalidSettlementException(String message) {
        super(message);
    }
}
