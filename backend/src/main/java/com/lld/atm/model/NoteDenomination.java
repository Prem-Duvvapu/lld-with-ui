package com.lld.atm.model;

public enum NoteDenomination {
    TWO_THOUSAND(2000),
    FIVE_HUNDRED(500),
    TWO_HUNDRED(200),
    ONE_HUNDRED(100);

    private final int value;

    NoteDenomination(int value) {
        this.value = value;
    }

    public int getValue() {
        return value;
    }
}
