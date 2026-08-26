package com.lld.ludo.state;

import com.lld.ludo.model.TokenStatus;

import java.util.EnumSet;
import java.util.Set;

/**
 * ACTIVE — on the shared track. May be captured back to HOME by an opponent landing on its
 * (non-safe) square, or reach FINISHED with an exact-count roll onto its last cell. A plain
 * forward move that neither captures nor finishes is not a status transition at all — only
 * {@link com.lld.ludo.model.Token#getPosition()} changes, so {@code allowedNext} does not include
 * ACTIVE itself.
 */
public final class ActiveState implements TokenState {
    public static final ActiveState INSTANCE = new ActiveState();

    private static final Set<TokenStatus> ALLOWED_NEXT = EnumSet.of(TokenStatus.HOME, TokenStatus.FINISHED);

    private ActiveState() {}

    @Override
    public TokenStatus getStatus() {
        return TokenStatus.ACTIVE;
    }

    @Override
    public Set<TokenStatus> allowedNext() {
        return ALLOWED_NEXT;
    }
}
