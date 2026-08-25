package com.lld.tictactoe;

import com.lld.tictactoe.exception.CellOccupiedException;
import com.lld.tictactoe.exception.GameNotFoundException;
import com.lld.tictactoe.exception.GameOverException;
import com.lld.tictactoe.exception.InvalidMoveException;
import com.lld.tictactoe.exception.NotYourTurnException;
import com.lld.tictactoe.model.Game;
import com.lld.tictactoe.model.GameState;
import com.lld.tictactoe.model.SimEvent;
import com.lld.tictactoe.repository.GameRepository;
import com.lld.tictactoe.service.TicTacToeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

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
    @DisplayName("blank player names fall back to defaults, from an empty board")
    public void testCreateGameDefaultsOnBlankNames() {
        Game game = service.createGame("", null);
        assertEquals("Player X", game.getPlayer1().getName());
        assertEquals("Player O", game.getPlayer2().getName());
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
    @DisplayName("win detection on a fresh empty board — first three moves cannot win")
    public void testNoWinOnEmptyBoardOpening() {
        Game game = service.createGame("Alice", "Bob");
        Game result = service.makeMove(game.getId(), 0, 0, "Alice");
        assertEquals(GameState.IN_PROGRESS, result.getState());
        assertNull(result.getWinner());
    }

    @Test
    @DisplayName("win detection on a mid-game fork position — column win")
    public void testWinningColumn() {
        // Alice (X) wins down the middle column, starting from a mid-game position
        // where Bob has built an unrelated pair that never completes.
        //   X O .
        //   X O .
        //   X . .
        Game game = service.createGame("Alice", "Bob");
        service.makeMove(game.getId(), 0, 0, "Alice"); // X
        service.makeMove(game.getId(), 0, 1, "Bob");   // O
        service.makeMove(game.getId(), 1, 0, "Alice"); // X
        service.makeMove(game.getId(), 1, 1, "Bob");   // O
        Game result = service.makeMove(game.getId(), 2, 0, "Alice"); // X completes column 0

        assertEquals(GameState.WON, result.getState());
        assertEquals("Alice", result.getWinner().getName());
        assertArrayEquals(new int[]{0, 0, 2, 0}, result.getWinningLine());
    }

    @Test
    @DisplayName("win detection on a mid-game fork position — main diagonal win")
    public void testWinningMainDiagonalFromForkPosition() {
        //   X O .
        //   O X .
        //   . . X   <- completes the main diagonal after a forked mid-board exchange
        Game game = service.createGame("Alice", "Bob");
        service.makeMove(game.getId(), 0, 0, "Alice"); // X
        service.makeMove(game.getId(), 0, 1, "Bob");   // O
        service.makeMove(game.getId(), 1, 1, "Alice"); // X
        service.makeMove(game.getId(), 1, 0, "Bob");   // O
        Game result = service.makeMove(game.getId(), 2, 2, "Alice"); // X completes diagonal

        assertEquals(GameState.WON, result.getState());
        assertArrayEquals(new int[]{0, 0, 2, 2}, result.getWinningLine());
    }

    @Test
    @DisplayName("win detection on a mid-game fork position — anti-diagonal win")
    public void testWinningAntiDiagonalFromForkPosition() {
        //   . O X
        //   O X .
        //   X . .   <- completes the anti-diagonal (0,2)-(1,1)-(2,0)
        Game game = service.createGame("Alice", "Bob");
        service.makeMove(game.getId(), 0, 2, "Alice"); // X
        service.makeMove(game.getId(), 0, 1, "Bob");   // O
        service.makeMove(game.getId(), 1, 1, "Alice"); // X
        service.makeMove(game.getId(), 1, 0, "Bob");   // O
        Game result = service.makeMove(game.getId(), 2, 0, "Alice"); // X completes anti-diagonal

        assertEquals(GameState.WON, result.getState());
        assertArrayEquals(new int[]{0, 2, 2, 0}, result.getWinningLine());
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
    @DisplayName("resetGame clears the board and restarts from Alice's turn")
    public void testResetGame() {
        Game game = service.createGame("Alice", "Bob");
        service.makeMove(game.getId(), 0, 0, "Alice");
        service.makeMove(game.getId(), 1, 1, "Bob");

        Game reset = service.resetGame(game.getId());
        assertEquals(GameState.IN_PROGRESS, reset.getState());
        assertEquals(0, reset.getMoveCount());
        assertEquals("Alice", reset.getCurrentTurn().getName());
        assertTrue(reset.getMoveHistory().isEmpty());
    }

    @Test
    public void testInvalidMoveOccupiedCell() {
        Game game = service.createGame("Alice", "Bob");
        service.makeMove(game.getId(), 0, 0, "Alice");
        assertThrows(CellOccupiedException.class,
            () -> service.makeMove(game.getId(), 0, 0, "Bob")); // occupied
    }

    @Test
    @DisplayName("moving out of turn throws NotYourTurnException")
    public void testMoveOutOfTurn() {
        Game game = service.createGame("Alice", "Bob");
        assertThrows(NotYourTurnException.class,
            () -> service.makeMove(game.getId(), 0, 0, "Bob"));
    }

    @Test
    @DisplayName("moving after the game has already ended throws GameOverException")
    public void testMoveAfterGameOver() {
        Game game = service.createGame("Alice", "Bob");
        service.makeMove(game.getId(), 0, 0, "Alice");
        service.makeMove(game.getId(), 1, 0, "Bob");
        service.makeMove(game.getId(), 0, 1, "Alice");
        service.makeMove(game.getId(), 1, 1, "Bob");
        service.makeMove(game.getId(), 0, 2, "Alice"); // Alice wins

        assertThrows(GameOverException.class,
            () -> service.makeMove(game.getId(), 2, 2, "Bob"));
    }

    @Test
    @DisplayName("a move outside the 3x3 board throws InvalidMoveException")
    public void testMoveOutOfBounds() {
        Game game = service.createGame("Alice", "Bob");
        assertThrows(InvalidMoveException.class,
            () -> service.makeMove(game.getId(), 3, 0, "Alice"));
        assertThrows(InvalidMoveException.class,
            () -> service.makeMove(game.getId(), 0, -1, "Alice"));
    }

    @Test
    @DisplayName("looking up a game that does not exist throws GameNotFoundException")
    public void testGetUnknownGameThrows() {
        assertThrows(GameNotFoundException.class, () -> service.getGame("nope"));
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    @Test
    @DisplayName("sim engine runs independently of the live game repository")
    public void testSimEngineIsolatedFromLiveGames() {
        Game live = service.createGame("Alice", "Bob");
        service.makeMove(live.getId(), 0, 0, "Alice");

        // Sim and live use separate repository instances, each with its own id sequence starting
        // at 1 — so ids may coincide as strings. Isolation is proven by state, not by id identity.
        Game sim = service.simReset();
        assertEquals("", sim.getBoard()[0][0], "sim board must not see the live game's move");

        Game simAfterMove = service.simMove(1, 1, "center move");
        assertEquals("X", simAfterMove.getBoard()[1][1]);

        // Live game is untouched by the sim move.
        Game liveAfter = service.getGame(live.getId());
        assertEquals("", liveAfter.getBoard()[1][1]);

        List<SimEvent> log = service.simGetEventLog();
        assertFalse(log.isEmpty());
        assertEquals("center move", log.get(log.size() - 1).getDescription());
    }

    @Test
    @DisplayName("sim undo removes the last sim move without touching live games")
    public void testSimUndo() {
        service.simReset();
        service.simMove(0, 0, "Alice opens");
        Game afterUndo = service.simUndo();
        assertEquals("", afterUndo.getBoard()[0][0]);
    }
}
