package com.lld.atm.state;

import com.lld.atm.model.ATMState;

import java.util.EnumMap;
import java.util.Map;

/** Resolves {@link ATMState} to its singleton {@link SessionState}. Built once, read-only after. */
public final class SessionStates {

    private static final Map<ATMState, SessionState> BY_STATUS = new EnumMap<>(ATMState.class);

    static {
        BY_STATUS.put(ATMState.IDLE, IdleSessionState.INSTANCE);
        BY_STATUS.put(ATMState.CARD_INSERTED, CardInsertedSessionState.INSTANCE);
        BY_STATUS.put(ATMState.AUTHENTICATED, AuthenticatedSessionState.INSTANCE);
        BY_STATUS.put(ATMState.TRANSACTION_IN_PROGRESS, TransactionInProgressSessionState.INSTANCE);
        BY_STATUS.put(ATMState.DISPENSING, DispensingSessionState.INSTANCE);
        BY_STATUS.put(ATMState.CARD_BLOCKED, CardBlockedSessionState.INSTANCE);
        BY_STATUS.put(ATMState.SESSION_ENDED, SessionEndedSessionState.INSTANCE);
    }

    private SessionStates() {}

    public static SessionState of(ATMState status) {
        SessionState state = BY_STATUS.get(status);
        if (state == null) {
            throw new IllegalArgumentException("No SessionState registered for status " + status);
        }
        return state;
    }
}
