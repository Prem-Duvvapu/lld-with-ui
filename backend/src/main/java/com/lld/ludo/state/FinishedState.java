package com.lld.ludo.state;

import com.lld.ludo.model.TokenStatus;

import java.util.Collections;
import java.util.Set;

/** FINISHED — completed the circuit. Terminal: no legal next status. */
public final class FinishedState implements TokenState {
    public static final FinishedState INSTANCE = new FinishedState();

    private FinishedState() {}

    @Override
    public TokenStatus getStatus() {
        return TokenStatus.FINISHED;
    }

    @Override
    public Set<TokenStatus> allowedNext() {
        return Collections.emptySet();
    }
}
