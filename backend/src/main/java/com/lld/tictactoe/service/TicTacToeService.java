package com.lld.tictactoe.service;

import com.lld.tictactoe.model.*;
import com.lld.tictactoe.repository.GameRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

/**
 * TicTacToeService — manages the game lifecycle.
 *
 * Thread safety: per-game ReentrantLock stored in ConcurrentHashMap.
 */
@Service
public class TicTacToeService {

    private final GameRepository repository;
    private final ConcurrentHashMap<String, ReentrantLock> gameLocks = new ConcurrentHashMap<>();

    public TicTacToeService(@Qualifier("tictactoeGameRepository") GameRepository repository) {
        this.repository = repository;
    }

    /** Creates a new 2-player game and saves it in the in-memory repository. */
    public Game createGame(String player1, String player2) {
        String id = repository.generateId();
        String p1 = (player1 != null && !player1.isBlank()) ? player1 : "Player X";
        String p2 = (player2 != null && !player2.isBlank()) ? player2 : "Player O";
        Game game = new Game(id, p1, p2);
        repository.save(game);
        gameLocks.put(id, new ReentrantLock());
        return game;
    }

    /** Retrieves a game by ID. Throws if not found. */
    public Game getGame(String id) {
        Game game = repository.get(id);
        if (game == null) throw new IllegalArgumentException("Game not found: " + id);
        return game;
    }

    /**
     * Makes a move on behalf of {@code playerName} at (row, col).
     * Validates turn ownership and cell availability.
     */
    public Game makeMove(String gameId, int row, int col, String playerName) {
        Game game = getGame(gameId);
        ReentrantLock lock = gameLocks.computeIfAbsent(gameId, k -> new ReentrantLock());
        lock.lock();
        try {
            Player currentPlayer = game.getCurrentTurn();
            if (!currentPlayer.getName().equals(playerName)) {
                throw new IllegalStateException("Not your turn. Current turn: " + currentPlayer.getName());
            }
            boolean success = game.makeMove(row, col, currentPlayer);
            if (!success) {
                throw new IllegalStateException("Invalid move at (" + row + ", " + col + ")");
            }
            return game;
        } finally {
            lock.unlock();
        }
    }

    /** Undoes the last move if the game is still IN_PROGRESS. */
    public Game undoLastMove(String gameId) {
        Game game = getGame(gameId);
        ReentrantLock lock = gameLocks.computeIfAbsent(gameId, k -> new ReentrantLock());
        lock.lock();
        try {
            game.undoLastMove();
            return game;
        } finally {
            lock.unlock();
        }
    }

    /** Resets the board and restarts the game. */
    public Game resetGame(String gameId) {
        Game game = getGame(gameId);
        ReentrantLock lock = gameLocks.computeIfAbsent(gameId, k -> new ReentrantLock());
        lock.lock();
        try {
            game.reset();
            return game;
        } finally {
            lock.unlock();
        }
    }
}
