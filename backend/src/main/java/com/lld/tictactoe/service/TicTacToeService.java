package com.lld.tictactoe.service;

import com.lld.tictactoe.exception.CellOccupiedException;
import com.lld.tictactoe.exception.GameNotFoundException;
import com.lld.tictactoe.exception.GameOverException;
import com.lld.tictactoe.exception.InvalidMoveException;
import com.lld.tictactoe.exception.NotYourTurnException;
import com.lld.tictactoe.model.Game;
import com.lld.tictactoe.model.GameStatus;
import com.lld.tictactoe.model.Player;
import com.lld.tictactoe.model.SimEvent;
import com.lld.tictactoe.repository.GameRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

/**
 * TicTacToeService — manages the game lifecycle plus the isolated {@code /sim/*} demo engine.
 *
 * <p>Thread safety: per-game {@link ReentrantLock} stored in a {@link ConcurrentHashMap}, taken
 * for the whole read-validate-mutate span of {@link #makeMove}, {@link #undoLastMove} and
 * {@link #resetGame} — mirrors {@code ChessService}'s per-game locking so two near-simultaneous
 * move requests for the same game cannot both read the pre-move board and both mutate it.
 */
@Service
public class TicTacToeService {

    private final GameRepository repository;
    private final ConcurrentHashMap<String, ReentrantLock> gameLocks = new ConcurrentHashMap<>();

    // Isolated simulation engine — a separate repository instance so the demo cannot corrupt
    // real game state, mirroring chess's simRepository pattern.
    private final GameRepository simRepository = new GameRepository();
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);
    private volatile String simGameId = null;

    public TicTacToeService(@Qualifier("tictactoeGameRepository") GameRepository repository) {
        this.repository = repository;
    }

    // =========================================================================
    // LIVE GAME API
    // =========================================================================

    /** Creates a new 2-player game and saves it in the in-memory repository. */
    public Game createGame(String player1, String player2) {
        String p1 = (player1 != null && !player1.isBlank()) ? player1 : "Player X";
        String p2 = (player2 != null && !player2.isBlank()) ? player2 : "Player O";
        return newGame(repository, p1, p2);
    }

    /** Retrieves a game by ID. Throws {@link GameNotFoundException} if absent. */
    public Game getGame(String id) {
        Game game = repository.get(id);
        if (game == null) throw new GameNotFoundException("Game not found: " + id);
        return game;
    }

    /**
     * Makes a move on behalf of {@code playerName} at (row, col).
     * Validates board bounds, game-over state, turn ownership and cell availability, in that
     * order, so the caller always gets the most specific applicable error.
     */
    public Game makeMove(String gameId, int row, int col, String playerName) {
        ReentrantLock lock = gameLocks.computeIfAbsent(gameId, k -> new ReentrantLock());
        lock.lock();
        try {
            Game game = getGame(gameId);
            applyMove(game, row, col, playerName);
            return game;
        } finally {
            lock.unlock();
        }
    }

    /** Undoes the last move if the game is still IN_PROGRESS. */
    public Game undoLastMove(String gameId) {
        ReentrantLock lock = gameLocks.computeIfAbsent(gameId, k -> new ReentrantLock());
        lock.lock();
        try {
            Game game = getGame(gameId);
            game.undoLastMove();
            return game;
        } finally {
            lock.unlock();
        }
    }

    /** Resets the board and restarts the game. */
    public Game resetGame(String gameId) {
        ReentrantLock lock = gameLocks.computeIfAbsent(gameId, k -> new ReentrantLock());
        lock.lock();
        try {
            Game game = getGame(gameId);
            game.reset();
            return game;
        } finally {
            lock.unlock();
        }
    }

    // =========================================================================
    // MOVE APPLICATION (shared by the live API and the sim engine)
    // =========================================================================

    private Game newGame(GameRepository targetRepository, String p1, String p2) {
        String id = targetRepository.generateId();
        Game game = new Game(id, p1, p2);
        targetRepository.save(game);
        return game;
    }

    private void applyMove(Game game, int row, int col, String playerName) {
        if (row < 0 || row >= game.getBoardObj().getSize() || col < 0 || col >= game.getBoardObj().getSize()) {
            throw new InvalidMoveException("Cell (" + row + ", " + col + ") is outside the board");
        }
        if (game.getStatus() != GameStatus.IN_PROGRESS) {
            throw new GameOverException("Game is over: " + game.getStatus());
        }
        Player currentPlayer = game.getCurrentTurn();
        if (!currentPlayer.getName().equals(playerName)) {
            throw new NotYourTurnException("Not your turn. Current turn: " + currentPlayer.getName());
        }
        if (!game.getBoardObj().isCellEmpty(row, col)) {
            throw new CellOccupiedException("Cell (" + row + ", " + col + ") is already occupied");
        }
        boolean success = game.makeMove(row, col, currentPlayer);
        if (!success) {
            // Defensive: every precondition above already holds, so this should be unreachable.
            throw new InvalidMoveException("Invalid move at (" + row + ", " + col + ")");
        }
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE (/api/tictactoe/sim/*)
    // =========================================================================

    public Game simReset() {
        Game game = newGame(simRepository, "Alice", "Bob");
        simGameId = game.getId();
        simEventLog.clear();
        simEventIdGen.set(1);
        logSimEvent(game, "system", "Simulation reset — fresh 3x3 board, X=Alice, O=Bob.");
        return game;
    }

    public Game simGetGame() {
        if (simGameId == null) return simReset();
        return simRepository.get(simGameId);
    }

    public List<SimEvent> simGetEventLog() {
        return new ArrayList<>(simEventLog);
    }

    public Game simMove(int row, int col, String description) {
        if (simGameId == null) simReset();
        Game game = simRepository.get(simGameId);
        String actor = game.getCurrentTurn().getName();
        applyMove(game, row, col, actor);
        logSimEvent(game, actor, description);
        return game;
    }

    public Game simUndo() {
        if (simGameId == null) simReset();
        Game game = simRepository.get(simGameId);
        game.undoLastMove();
        logSimEvent(game, "system", "Last move undone.");
        return game;
    }

    private void logSimEvent(Game game, String actor, String description) {
        String[][] boardCopy = new String[game.getBoardObj().getSize()][];
        String[][] board = game.getBoard();
        for (int r = 0; r < board.length; r++) {
            boardCopy[r] = board[r].clone();
        }
        simEventLog.add(SimEvent.builder()
                .id(simEventIdGen.getAndIncrement())
                .timestamp(Instant.now().toString())
                .actor(actor)
                .description(description)
                .boardSnapshot(boardCopy)
                .status(game.getStatus())
                .build());
    }
}
