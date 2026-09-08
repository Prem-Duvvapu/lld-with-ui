package com.lld.locker.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * 409, not 503: the request itself is fine and the server is healthy — the bank's current state
 * (every locker of the required size is occupied) is what makes it currently unsatisfiable, the
 * same shape as {@code shoppingcart.exception.InsufficientStockException} and
 * {@code atm.exception.InsufficientCashException}, both 409 for the identical reason.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class NoAvailableLockerException extends LockerException {
    public NoAvailableLockerException(String message) {
        super(message);
    }
}
