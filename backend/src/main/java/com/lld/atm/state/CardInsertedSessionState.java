package com.lld.atm.state;

import com.lld.atm.model.ATMState;

import java.util.Set;

/** Card read, PIN not yet verified. Withdraw/deposit/balance are illegal here. */
public final class CardInsertedSessionState implements SessionState {
    public static final CardInsertedSessionState INSTANCE = new CardInsertedSessionState();

    private CardInsertedSessionState() {}

    @Override
    public ATMState getStatus() {
        return ATMState.CARD_INSERTED;
    }

    @Override
    public Set<ATMState> allowedNext() {
        return Set.of(ATMState.AUTHENTICATED, ATMState.CARD_BLOCKED, ATMState.SESSION_ENDED);
    }
}
