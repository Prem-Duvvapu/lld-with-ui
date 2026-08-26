package com.lld.ludo.model;

/**
 * One token's lifecycle phase. {@code HOME -> ACTIVE} on a roll of 6, {@code ACTIVE -> HOME}
 * again on capture, {@code ACTIVE -> FINISHED} on an exact-count landing on the last cell.
 * {@code FINISHED} is terminal. See {@code com.lld.ludo.state.TokenState} for the declared
 * transition table this enum drives.
 */
public enum TokenStatus {
    HOME, ACTIVE, FINISHED
}
