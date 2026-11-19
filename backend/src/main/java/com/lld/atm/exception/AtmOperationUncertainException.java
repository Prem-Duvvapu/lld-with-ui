package com.lld.atm.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Unexpected infrastructure failure; this is not a rejected domain operation. */
@ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
public class AtmOperationUncertainException extends RuntimeException {
    public AtmOperationUncertainException(Throwable cause) {
        super("The ATM operation has an uncertain outcome. Check its recorded outcome and account before another transaction", cause);
    }
}
