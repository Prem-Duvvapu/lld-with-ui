package com.lld.digitalwallet.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** A transfer named the same wallet as both sender and recipient. */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class SelfTransferException extends WalletException {
    public SelfTransferException(long walletId) {
        super("Cannot transfer money from wallet " + walletId + " to itself.");
    }
}
