package com.lld.atm.state;

import com.lld.atm.model.ATMState;

import java.util.Set;

/** Notes physically leaving the CashDispenser slot. Settles back to AUTHENTICATED once done. */
public final class DispensingSessionState implements SessionState {
    public static final DispensingSessionState INSTANCE = new DispensingSessionState();

    private DispensingSessionState() {}

    @Override
    public ATMState getStatus() {
        return ATMState.DISPENSING;
    }

    @Override
    public Set<ATMState> allowedNext() {
        return Set.of(ATMState.AUTHENTICATED, ATMState.SESSION_ENDED);
    }
}
