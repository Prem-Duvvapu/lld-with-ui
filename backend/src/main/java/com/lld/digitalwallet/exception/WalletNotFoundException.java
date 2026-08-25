package com.lld.digitalwallet.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** No wallet exists with the requested id. */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class WalletNotFoundException extends WalletException {
    public WalletNotFoundException(long walletId) {
        super("No wallet with id " + walletId + ".");
    }
}
