package com.lld.tictactoe;

import com.lld.tictactoe.model.Game;
import com.lld.tictactoe.model.GameState;
import com.lld.tictactoe.repository.GameRepository;
import com.lld.tictactoe.service.TicTacToeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class TicTacToeServiceTest {

    private TicTacToeService service;

    @BeforeEach
    public void setUp() {
        service = new TicTacToeService(new GameRepository());
    }

    @Test
    public void testCreateGame() {
        Game game = service.createGame("Alice", "Bob");
        assertNotNull(game);
        assertEquals("Alice", game.getPlayer1().getName());
        assertEquals("Bob", game.getPlayer2().getName());
        assertEquals(GameState.IN_PROGRESS, game.getState());
        assertEquals("Alice", game.getCurrentTurn().getName());
    }

    @Test
    public void testWinningRow() {
        // Alice (X) wins across top row
        Game game = service.createGame("Alice", "Bob");
        service.makeMove(game.getId(), 0, 0, "Alice"); // X
        service.makeMove(game.getId(), 1, 0, "Bob");   // O
        service.makeMove(game.getId(), 0, 1, "Alice"); // X
        service.makeMove(game.getId(), 1, 1, "Bob");   // O
        Game result = service.makeMove(game.getId(), 0, 2, "Alice"); // X wins row 0

        assertEquals(GameState.WON, result.getState());
        assertEquals("Alice", result.getWinner().getName());
        assertNotNull(result.getWinningLine());
        assertArrayEquals(new int[]{0, 0, 0, 2}, result.getWinningLine());
    }

    @Test
    public void testDraw() {
        // Force a draw: X O X / O X O / O X O ... actually draw sequence
        // X O X
        // X X O
        // O X O  => draw (no winner)
        Game game = service.createGame("Alice", "Bob");
        service.makeMove(game.getId(), 0, 0, "Alice"); // X
        service.makeMove(game.getId(), 0, 1, "Bob");   // O
        service.makeMove(game.getId(), 0, 2, "Alice"); // X
        service.makeMove(game.getId(), 1, 0, "Bob");   // O
        service.makeMove(game.getId(), 1, 1, "Alice"); // X
        service.makeMove(game.getId(), 2, 0, "Bob");   // O
        service.makeMove(game.getId(), 1, 2, "Alice"); // X
        service.makeMove(game.getId(), 2, 2, "Bob");   // O
        Game result = service.makeMove(game.getId(), 2, 1, "Alice"); // X fills last cell

        assertEquals(GameState.DRAW, result.getState());
        assertNull(result.getWinner());
    }

    @Test
    public void testUndoMove() {
        Game game = service.createGame("Alice", "Bob");
        service.makeMove(game.getId(), 0, 0, "Alice");
        assertEquals(1, game.getMoveCount());
        assertEquals("X", game.getBoard()[0][0]);

        Game updated = service.undoLastMove(game.getId());
        assertEquals(0, updated.getMoveCount());
        assertEquals("", updated.getBoard()[0][0]);
        assertEquals("Alice", updated.getCurrentTurn().getName());
    }

    @Test
    public void testInvalidMoveOccupiedCell() {
        Game game = service.createGame("Alice", "Bob");
        service.makeMove(game.getId(), 0, 0, "Alice");
        assertThrows(IllegalStateException.class,
            () -> service.makeMove(game.getId(), 0, 0, "Bob")); // occupied
    }
}
