package com.lld.digitalwallet.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** A DEBIT or TRANSFER would take a wallet's balance below zero — the caller lost the race or asked for too much. */
@ResponseStatus(HttpStatus.CONFLICT)
public class InsufficientBalanceException extends WalletException {
    public InsufficientBalanceException(long walletId, double requested, double available) {
        super("Wallet " + walletId + " has insufficient balance: requested " + requested + ", available " + available);
    }
}
