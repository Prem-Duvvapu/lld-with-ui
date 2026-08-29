package com.lld.atm.state;

import com.lld.atm.model.ATMState;

import java.util.Set;

/** Card ejected. Terminal settles back to IDLE, or straight into the next customer's card. */
public final class SessionEndedSessionState implements SessionState {
    public static final SessionEndedSessionState INSTANCE = new SessionEndedSessionState();

    private SessionEndedSessionState() {}

    @Override
    public ATMState getStatus() {
        return ATMState.SESSION_ENDED;
    }

    @Override
    public Set<ATMState> allowedNext() {
        return Set.of(ATMState.IDLE, ATMState.CARD_INSERTED);
    }
}
