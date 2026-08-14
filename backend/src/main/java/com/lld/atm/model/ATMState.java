package com.lld.atm.model;

public enum ATMState {
    IDLE,
    CARD_INSERTED,
    AUTHENTICATED,
    TRANSACTION_IN_PROGRESS,
    DISPENSING,
    SESSION_ENDED,
    CARD_BLOCKED
}
