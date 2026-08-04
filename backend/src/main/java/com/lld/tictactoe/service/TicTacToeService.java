package com.lld.tictactoe.service;

import com.lld.tictactoe.model.*;
import com.lld.tictactoe.repository.GameRepository;
import com.lld.tictactoe.strategy.AIMoveStrategy;
import com.lld.tictactoe.strategy.MinimaxAIMoveStrategy;
import com.lld.tictactoe.strategy.RandomAIMoveStrategy;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class TicTacToeService {

    private final GameRepository repository;
    private final ConcurrentHashMap<String, ReentrantLock> gameLocks = new ConcurrentHashMap<>();

    public TicTacToeService(@Qualifier("tictactoeGameRepository") GameRepository repository) {
        this.repository = repository;
    }

    public Game createGame(String player1, String player2, GameMode mode, AIDifficulty difficulty) {
        String id = repository.generateId();
        String p2 = (mode == GameMode.HUMAN_VS_AI) ? (player2 != null && !player2.isBlank() ? player2 : "AI Bot 🤖") : player2;
        Game game = new Game(id, player1, p2, mode, difficulty);
        repository.save(game);
        gameLocks.put(id, new ReentrantLock());
        return game;
    }

    public Game getGame(String id) {
        Game game = repository.get(id);
        if (game == null) throw new IllegalArgumentException("Game not found: " + id);
        return game;
    }

    public Game makeMove(String gameId, int row, int col, String playerName) {
        Game game = getGame(gameId);
        ReentrantLock lock = gameLocks.computeIfAbsent(gameId, k -> new ReentrantLock());
        lock.lock();
        try {
            Player player = game.getCurrentTurn();
            if (!player.getName().equals(playerName)) {
                throw new IllegalStateException("Not your turn. Current turn: " + player.getName());
            }

            boolean success = game.makeMove(row, col, player);
            if (!success) {
                throw new IllegalStateException("Invalid move at (" + row + ", " + col + ")");
            }

            // Auto-trigger AI move if HUMAN_VS_AI mode and game is IN_PROGRESS
            if (game.getGameMode() == GameMode.HUMAN_VS_AI
                    && game.getState() == GameState.IN_PROGRESS
                    && game.getCurrentTurn().getSymbol() == Player.Symbol.O) {
                triggerAIMove(game);
            }

            return game;
        } finally {
            lock.unlock();
        }
    }

    private void triggerAIMove(Game game) {
        AIMoveStrategy strategy = (game.getAiDifficulty() == AIDifficulty.EASY)
                ? new RandomAIMoveStrategy()
                : new MinimaxAIMoveStrategy();

        int[] bestMove = strategy.findBestMove(game);
        if (bestMove != null) {
            game.makeMove(bestMove[0], bestMove[1], game.getCurrentTurn());
        }
    }

    public Game undoLastMove(String gameId) {
        Game game = getGame(gameId);
        ReentrantLock lock = gameLocks.computeIfAbsent(gameId, k -> new ReentrantLock());
        lock.lock();
        try {
            boolean undone = game.undoLastMove();
            if (game.getGameMode() == GameMode.HUMAN_VS_AI && undone && !game.getMoveHistory().isEmpty()) {
                // Undo AI move too so human player gets turn back
                game.undoLastMove();
            }
            return game;
        } finally {
            lock.unlock();
        }
    }

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
