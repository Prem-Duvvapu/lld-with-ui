package com.lld.chess.model;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Game lifecycle, with the legal transitions declared rather than implied.
 *
 * <p>{@code ACTIVE} and {@code CHECK} are recomputed fresh after every accepted move (whoever
 * is now on the move might be in check, checkmated, stalemated, or simply to move); the four
 * terminal statuses never move again once reached. Mirrors {@code uber.model.RideStatus}.
 */
public enum GameStatus {
    ACTIVE,
    CHECK,
    CHECKMATE,
    STALEMATE,
    DRAW,
    RESIGNED;

    private static final Map<GameStatus, Set<GameStatus>> ALLOWED = Map.of(
            ACTIVE, EnumSet.of(ACTIVE, CHECK, CHECKMATE, STALEMATE, DRAW, RESIGNED),
            CHECK, EnumSet.of(ACTIVE, CHECK, CHECKMATE, STALEMATE, DRAW, RESIGNED),
            CHECKMATE, EnumSet.noneOf(GameStatus.class),
            STALEMATE, EnumSet.noneOf(GameStatus.class),
            DRAW, EnumSet.noneOf(GameStatus.class),
            RESIGNED, EnumSet.noneOf(GameStatus.class)
    );

    /** True once the game can never accept another move. */
    public boolean isTerminal() {
        return ALLOWED.get(this).isEmpty();
    }

    public boolean canTransitionTo(GameStatus next) {
        return next != null && ALLOWED.get(this).contains(next);
    }

    public Set<GameStatus> allowedNext() {
        return Collections.unmodifiableSet(ALLOWED.get(this));
    }
}
