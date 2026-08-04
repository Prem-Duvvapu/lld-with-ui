package com.lld.tictactoe;

import com.lld.tictactoe.model.AIDifficulty;
import com.lld.tictactoe.model.Game;
import com.lld.tictactoe.model.GameMode;
import com.lld.tictactoe.model.GameState;
import com.lld.tictactoe.repository.GameRepository;
import com.lld.tictactoe.service.TicTacToeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class TicTacToeServiceTest {

    private TicTacToeService service;
    private GameRepository repository;

    @BeforeEach
    public void setUp() {
        repository = new GameRepository();
        service = new TicTacToeService(repository);
    }

    @Test
    public void testCreateGameHumanVsHuman() {
        Game game = service.createGame("Alice", "Bob", GameMode.HUMAN_VS_HUMAN, AIDifficulty.EASY);
        assertNotNull(game);
        assertEquals("Alice", game.getPlayer1().getName());
        assertEquals("Bob", game.getPlayer2().getName());
        assertEquals(GameState.IN_PROGRESS, game.getState());
        assertEquals("Alice", game.getCurrentTurn().getName());
    }

    @Test
    public void testHumanVsHumanWinningRow() {
        Game game = service.createGame("Alice", "Bob", GameMode.HUMAN_VS_HUMAN, AIDifficulty.EASY);
        service.makeMove(game.getId(), 0, 0, "Alice"); // X
        service.makeMove(game.getId(), 1, 0, "Bob");   // O
        service.makeMove(game.getId(), 0, 1, "Alice"); // X
        service.makeMove(game.getId(), 1, 1, "Bob");   // O
        Game updated = service.makeMove(game.getId(), 0, 2, "Alice"); // X wins (row 0)

        assertEquals(GameState.WON, updated.getState());
        assertEquals("Alice", updated.getWinner().getName());
        assertNotNull(updated.getWinningLine());
        assertArrayEquals(new int[]{0, 0, 0, 2}, updated.getWinningLine());
    }

    @Test
    public void testHumanVsAIMinimax() {
        Game game = service.createGame("Alice", "AI Bot 🤖", GameMode.HUMAN_VS_AI, AIDifficulty.UNBEATABLE);
        service.makeMove(game.getId(), 0, 0, "Alice"); // X at (0,0)
        
        // AI should automatically move to center or optimal cell
        Game updated = service.getGame(game.getId());
        assertEquals(2, updated.getMoveCount()); // 1 human move + 1 AI move
        assertEquals("Alice", updated.getCurrentTurn().getName());
    }

    @Test
    public void testUndoMove() {
        Game game = service.createGame("Alice", "Bob", GameMode.HUMAN_VS_HUMAN, AIDifficulty.EASY);
        service.makeMove(game.getId(), 0, 0, "Alice");
        assertEquals(1, game.getMoveCount());

        Game updated = service.undoLastMove(game.getId());
        assertEquals(0, updated.getMoveCount());
        assertEquals("", updated.getBoard()[0][0]);
        assertEquals("Alice", updated.getCurrentTurn().getName());
    }
}
