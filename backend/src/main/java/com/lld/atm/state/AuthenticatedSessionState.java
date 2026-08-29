package com.lld.atm.state;

import com.lld.atm.model.ATMState;

import java.util.Set;

/** PIN verified. The only state a withdrawal/deposit/balance check may legally begin from. */
public final class AuthenticatedSessionState implements SessionState {
    public static final AuthenticatedSessionState INSTANCE = new AuthenticatedSessionState();

    private AuthenticatedSessionState() {}

    @Override
    public ATMState getStatus() {
        return ATMState.AUTHENTICATED;
    }

    @Override
    public Set<ATMState> allowedNext() {
        return Set.of(ATMState.TRANSACTION_IN_PROGRESS, ATMState.SESSION_ENDED);
    }
}
