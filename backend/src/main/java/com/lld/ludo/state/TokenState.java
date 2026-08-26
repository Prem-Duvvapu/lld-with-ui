package com.lld.ludo.state;

import com.lld.ludo.model.TokenStatus;

import java.util.Set;

/**
 * State pattern for one token's lifecycle phase — one singleton class per {@link TokenStatus}
 * constant, the same shape as {@code taskmanagement.state.TaskState} /
 * {@code trafficsignal.state.SignalState}. Each state declares the exact set of statuses it may
 * legally move to next via {@link #allowedNext()}.
 *
 * <p>{@link com.lld.ludo.model.Token#transitionTo(TokenStatus)} is the one place this table is
 * consulted and enforced.
 */
public interface TokenState {

    TokenStatus getStatus();

    /** The exact set of statuses this state may legally move to next. Empty for a terminal state. */
    Set<TokenStatus> allowedNext();

    /** True when a token in this state can never move again (FINISHED). */
    default boolean isTerminal() {
        return allowedNext().isEmpty();
    }

    default boolean canTransitionTo(TokenStatus target) {
        return target != null && allowedNext().contains(target);
    }
}
