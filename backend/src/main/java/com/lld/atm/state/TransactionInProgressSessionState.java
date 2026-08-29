package com.lld.atm.state;

import com.lld.atm.model.ATMState;

import java.util.Set;

/**
 * Balance/ledger mutation underway. A withdrawal moves on to {@code DISPENSING} for the physical
 * cash-out step; a deposit (no hardware dispense involved) returns straight to
 * {@code AUTHENTICATED}. Either can also be interrupted by an eject.
 */
public final class TransactionInProgressSessionState implements SessionState {
    public static final TransactionInProgressSessionState INSTANCE = new TransactionInProgressSessionState();

    private TransactionInProgressSessionState() {}

    @Override
    public ATMState getStatus() {
        return ATMState.TRANSACTION_IN_PROGRESS;
    }

    @Override
    public Set<ATMState> allowedNext() {
        return Set.of(ATMState.DISPENSING, ATMState.AUTHENTICATED, ATMState.SESSION_ENDED);
    }
}
