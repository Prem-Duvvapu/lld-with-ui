package com.lld.chess;

import com.lld.chess.model.GameStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("GameStatus transition table")
class GameStatusTest {

    @Test
    @DisplayName("CHECKMATE, STALEMATE, DRAW and RESIGNED are terminal")
    void terminalStatuses() {
        assertTrue(GameStatus.CHECKMATE.isTerminal());
        assertTrue(GameStatus.STALEMATE.isTerminal());
        assertTrue(GameStatus.DRAW.isTerminal());
        assertTrue(GameStatus.RESIGNED.isTerminal());
        assertTrue(GameStatus.CHECKMATE.allowedNext().isEmpty());
    }

    @Test
    @DisplayName("ACTIVE and CHECK are non-terminal and may move to any recomputed status")
    void nonTerminalStatuses() {
        assertFalse(GameStatus.ACTIVE.isTerminal());
        assertFalse(GameStatus.CHECK.isTerminal());
        assertTrue(GameStatus.ACTIVE.canTransitionTo(GameStatus.CHECKMATE));
        assertTrue(GameStatus.CHECK.canTransitionTo(GameStatus.ACTIVE));
    }

    @Test
    @DisplayName("A terminal status can never transition anywhere, not even to itself")
    void terminalCannotTransition() {
        assertFalse(GameStatus.CHECKMATE.canTransitionTo(GameStatus.CHECKMATE));
        assertFalse(GameStatus.STALEMATE.canTransitionTo(GameStatus.ACTIVE));
    }
}
