package com.lld.atm.state;

import com.lld.atm.model.ATMState;

import java.util.Set;

/** No card in the slot. A card can be inserted, or found already blocked on insertion. */
public final class IdleSessionState implements SessionState {
    public static final IdleSessionState INSTANCE = new IdleSessionState();

    private IdleSessionState() {}

    @Override
    public ATMState getStatus() {
        return ATMState.IDLE;
    }

    @Override
    public Set<ATMState> allowedNext() {
        return Set.of(ATMState.CARD_INSERTED, ATMState.CARD_BLOCKED);
    }
}
