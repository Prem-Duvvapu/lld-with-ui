package com.lld.learning.examples.statemachine;

public enum ReservationState {
    DRAFT, HELD, CONFIRMED, CANCELLED;

    public boolean isTerminal() {
        return this == CONFIRMED || this == CANCELLED;
    }
}
