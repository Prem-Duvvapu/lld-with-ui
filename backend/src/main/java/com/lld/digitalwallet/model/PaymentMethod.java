package com.lld.digitalwallet.model;

/** Supported ways to fund a {@link Wallet} via {@link com.lld.digitalwallet.command.CreditCommand}. */
public enum PaymentMethod {
    UPI, CARD, BANK_TRANSFER, WALLET_BALANCE
}
