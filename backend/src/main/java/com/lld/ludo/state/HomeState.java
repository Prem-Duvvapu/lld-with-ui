package com.lld.ludo.state;

import com.lld.ludo.model.TokenStatus;

import java.util.EnumSet;
import java.util.Set;

/** HOME — not yet on the track. May only move to ACTIVE, and only on a roll of exactly 6. */
public final class HomeState implements TokenState {
    public static final HomeState INSTANCE = new HomeState();

    private static final Set<TokenStatus> ALLOWED_NEXT = EnumSet.of(TokenStatus.ACTIVE);

    private HomeState() {}

    @Override
    public TokenStatus getStatus() {
        return TokenStatus.HOME;
    }

    @Override
    public Set<TokenStatus> allowedNext() {
        return ALLOWED_NEXT;
    }
}
