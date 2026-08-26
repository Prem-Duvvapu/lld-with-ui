package com.lld.ludo;

import com.lld.ludo.exception.InvalidMoveException;
import com.lld.ludo.model.Token;
import com.lld.ludo.model.TokenStatus;
import com.lld.ludo.state.ActiveState;
import com.lld.ludo.state.FinishedState;
import com.lld.ludo.state.HomeState;
import com.lld.ludo.state.TokenState;
import com.lld.ludo.state.TokenStates;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.EnumSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pins the exact declared transition table on {@code com.lld.ludo.state} and proves
 * {@link Token#transitionTo(TokenStatus)} enforces it — the state-machine unit-test flavour,
 * mirroring {@code TaskStateTest}.
 */
class LudoStateTest {

    private Token tokenIn(TokenStatus status) {
        return Token.builder().id(0).color("RED").position(status == TokenStatus.HOME ? -1 : 0).status(status).build();
    }

    // ------------------------------------------------------- declared table

    @Test
    @DisplayName("HOME may only move to ACTIVE")
    void home_allowedNext() {
        assertEquals(EnumSet.of(TokenStatus.ACTIVE), HomeState.INSTANCE.allowedNext());
    }

    @Test
    @DisplayName("ACTIVE may move to HOME (captured) or FINISHED (exact-count entry), never to itself")
    void active_allowedNext() {
        assertEquals(EnumSet.of(TokenStatus.HOME, TokenStatus.FINISHED), ActiveState.INSTANCE.allowedNext());
    }

    @Test
    @DisplayName("FINISHED is terminal — no legal next state")
    void finished_allowedNext() {
        assertEquals(Set.of(), FinishedState.INSTANCE.allowedNext());
        assertTrue(FinishedState.INSTANCE.isTerminal());
    }

    @ParameterizedTest
    @EnumSource(TokenStatus.class)
    @DisplayName("TokenStates.of resolves every status to a state whose getStatus() matches")
    void statesRegistry_roundTrips(TokenStatus status) {
        TokenState state = TokenStates.of(status);
        assertEquals(status, state.getStatus());
    }

    // ------------------------------------------------------- Token#transitionTo enforcement

    @Test
    @DisplayName("HOME -> ACTIVE is legal")
    void homeToActive_legal() {
        Token token = tokenIn(TokenStatus.HOME);
        token.transitionTo(TokenStatus.ACTIVE);
        assertEquals(TokenStatus.ACTIVE, token.getStatus());
    }

    @Test
    @DisplayName("HOME -> FINISHED is illegal — a token cannot skip the track entirely")
    void homeToFinished_illegal() {
        Token token = tokenIn(TokenStatus.HOME);
        InvalidMoveException ex = assertThrows(InvalidMoveException.class, () -> token.transitionTo(TokenStatus.FINISHED));
        assertTrue(ex.getMessage().contains("HOME"));
        assertEquals(TokenStatus.HOME, token.getStatus(), "a rejected transition must leave status unchanged");
    }

    @Test
    @DisplayName("ACTIVE -> HOME (capture) is legal")
    void activeToHome_legal() {
        Token token = tokenIn(TokenStatus.ACTIVE);
        token.transitionTo(TokenStatus.HOME);
        assertEquals(TokenStatus.HOME, token.getStatus());
    }

    @Test
    @DisplayName("ACTIVE -> FINISHED (exact-count entry) is legal")
    void activeToFinished_legal() {
        Token token = tokenIn(TokenStatus.ACTIVE);
        token.transitionTo(TokenStatus.FINISHED);
        assertEquals(TokenStatus.FINISHED, token.getStatus());
    }

    @Test
    @DisplayName("FINISHED -> anything is illegal, including re-declaring FINISHED")
    void finishedToAnything_illegal() {
        Token token = tokenIn(TokenStatus.FINISHED);
        assertThrows(InvalidMoveException.class, () -> token.transitionTo(TokenStatus.ACTIVE));
        assertThrows(InvalidMoveException.class, () -> token.transitionTo(TokenStatus.HOME));
        assertThrows(InvalidMoveException.class, () -> token.transitionTo(TokenStatus.FINISHED));
        assertEquals(TokenStatus.FINISHED, token.getStatus());
    }

    @Test
    @DisplayName("newHomeToken factory starts HOME at position -1")
    void newHomeToken_startsCorrectly() {
        Token token = Token.newHomeToken(2, "BLUE");
        assertEquals(TokenStatus.HOME, token.getStatus());
        assertEquals(-1, token.getPosition());
        assertEquals("BLUE", token.getColor());
        assertEquals(2, token.getId());
    }
}
