package com.lld.atm.state;

import com.lld.atm.model.ATMState;

import java.util.Set;

/** 3 consecutive wrong PINs. Nothing but ejecting/resetting the terminal is legal from here. */
public final class CardBlockedSessionState implements SessionState {
    public static final CardBlockedSessionState INSTANCE = new CardBlockedSessionState();

    private CardBlockedSessionState() {}

    @Override
    public ATMState getStatus() {
        return ATMState.CARD_BLOCKED;
    }

    @Override
    public Set<ATMState> allowedNext() {
        return Set.of(ATMState.SESSION_ENDED);
    }
}
