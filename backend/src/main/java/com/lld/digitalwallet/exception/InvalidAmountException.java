package com.lld.digitalwallet.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** A credit, debit or transfer amount was zero, negative or otherwise not a usable amount. */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidAmountException extends WalletException {
    public InvalidAmountException(double amount) {
        super("Amount must be positive, got " + amount + ".");
    }

    public InvalidAmountException(String message) {
        super(message);
    }
}
