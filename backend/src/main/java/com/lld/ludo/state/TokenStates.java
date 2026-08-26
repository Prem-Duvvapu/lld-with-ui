package com.lld.ludo.state;

import com.lld.ludo.model.TokenStatus;

import java.util.EnumMap;
import java.util.Map;

/** Resolves {@link TokenStatus} to its singleton {@link TokenState}. Built once, read-only after. */
public final class TokenStates {

    private static final Map<TokenStatus, TokenState> BY_STATUS = new EnumMap<>(TokenStatus.class);

    static {
        BY_STATUS.put(TokenStatus.HOME, HomeState.INSTANCE);
        BY_STATUS.put(TokenStatus.ACTIVE, ActiveState.INSTANCE);
        BY_STATUS.put(TokenStatus.FINISHED, FinishedState.INSTANCE);
    }

    private TokenStates() {}

    public static TokenState of(TokenStatus status) {
        TokenState state = BY_STATUS.get(status);
        if (state == null) {
            throw new IllegalArgumentException("No TokenState registered for status " + status);
        }
        return state;
    }
}
