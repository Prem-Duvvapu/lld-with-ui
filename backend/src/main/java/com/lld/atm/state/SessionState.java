package com.lld.atm.state;

import com.lld.atm.model.ATMState;

import java.util.Set;

/**
 * State pattern for one ATM terminal's session phase, matching the shape of
 * {@code com.lld.taskmanagement.state.TaskState} (a declared {@code Set} of legal next phases per
 * state, rather than a strict single-successor chain like {@code trafficsignal.state.SignalState}) —
 * a session can legally fan out to more than one next phase, e.g. {@code AUTHENTICATED} may move to
 * {@code TRANSACTION_IN_PROGRESS} (a withdrawal/deposit begins) or straight to {@code SESSION_ENDED}
 * (the customer ejects the card without transacting).
 *
 * <p>{@code AtmService#transitionTo(ATMState)} is the single place this table is consulted and
 * enforced; it throws {@link com.lld.atm.exception.InvalidSessionStateException} for anything not
 * in {@link #allowedNext()}. Every session-mutating method (insertCard, authenticate, withdraw,
 * deposit, ejectCard) routes through it — there is no other place {@code currentState} is assigned.
 */
public interface SessionState {

    ATMState getStatus();

    /** The exact set of session phases this state may legally move to next. */
    Set<ATMState> allowedNext();

    default boolean canTransitionTo(ATMState target) {
        return target != null && allowedNext().contains(target);
    }
}
