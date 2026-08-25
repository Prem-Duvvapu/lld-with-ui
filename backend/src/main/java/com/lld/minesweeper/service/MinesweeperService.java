package com.lld.minesweeper.service;

import com.lld.minesweeper.exception.GameNotFoundException;
import com.lld.minesweeper.exception.GameOverException;
import com.lld.minesweeper.exception.InvalidBoardConfigException;
import com.lld.minesweeper.exception.InvalidCellException;
import com.lld.minesweeper.model.Cell;
import com.lld.minesweeper.model.Game;
import com.lld.minesweeper.model.GameStatus;
import com.lld.minesweeper.model.SimEvent;
import com.lld.minesweeper.repository.MinesweeperRepository;
import com.lld.minesweeper.strategy.MinePlacer;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Facade for the whole module: board setup, first-click-safe mine placement, flood-fill reveal,
 * flagging, win/loss detection and the isolated {@code /sim/*} demo engine.
 *
 * <p><b>First-click-safe policy:</b> mines are NOT placed at {@link #createGame} time. The
 * board starts with zero mines; {@link #revealCell} places all {@code totalMines} mines — via
 * the injected {@link MinePlacer} — excluding the clicked cell, the very first time a cell is
 * revealed for that game. This guarantees a player's opening click is never a mine. (It does not
 * guarantee an opening cascade — only the clicked cell itself is excluded, not its neighborhood —
 * which is the simpler and more common of the two conventional first-click-safe policies.)
 *
 * <p>Concurrency: each game gets its own {@link ReentrantLock}, taken for the whole
 * read-validate-mutate span of {@link #revealCell} and {@link #flagCell} — mirrors
 * {@code ChessService}'s per-game locking. The previous implementation used one lock shared by
 * every game, which serialized unrelated games against each other for no reason.
 */
@Service
public class MinesweeperService {
    private static final int[] DR = {-1, -1, -1, 0, 0, 1, 1, 1};
    private static final int[] DC = {-1, 0, 1, -1, 1, -1, 0, 1};

    private final MinesweeperRepository repository;
    private final MinePlacer minePlacer;
    private final ConcurrentHashMap<Long, ReentrantLock> gameLocks = new ConcurrentHashMap<>();

    // Isolated simulation engine — a separate repository instance so the demo cannot corrupt
    // real game state, mirroring chess's simRepository pattern.
    private final MinesweeperRepository simRepository = new MinesweeperRepository();
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);
    private volatile Long simGameId = null;

    public MinesweeperService(MinesweeperRepository repository, MinePlacer minePlacer) {
        this.repository = repository;
        this.minePlacer = minePlacer;
    }

    // =========================================================================
    // LIVE GAME API
    // =========================================================================

    public Game createGame(int rows, int cols, int mines) {
        validateBoardConfig(rows, cols, mines);
        return newGame(repository, rows, cols, mines);
    }

    public Game getGame(long id) {
        Game game = findOrThrow(repository, id);
        maskUnrevealedMineCounts(game);
        return game;
    }

    public Game revealCell(long gameId, int row, int col) {
        ReentrantLock lock = gameLocks.computeIfAbsent(gameId, k -> new ReentrantLock());
        lock.lock();
        try {
            Game game = findOrThrow(repository, gameId);
            applyReveal(game, row, col);
            return game;
        } finally {
            lock.unlock();
        }
    }

    public Game flagCell(long gameId, int row, int col) {
        ReentrantLock lock = gameLocks.computeIfAbsent(gameId, k -> new ReentrantLock());
        lock.lock();
        try {
            Game game = findOrThrow(repository, gameId);
            applyFlag(game, row, col);
            return game;
        } finally {
            lock.unlock();
        }
    }

    // =========================================================================
    // SHARED GAME LOGIC (live API and sim engine)
    // =========================================================================

    private void validateBoardConfig(int rows, int cols, int mines) {
        if (rows <= 0 || cols <= 0) {
            throw new InvalidBoardConfigException("Board dimensions must be positive, got " + rows + "x" + cols);
        }
        if (mines < 0) {
            throw new InvalidBoardConfigException("Mine count cannot be negative, got: " + mines);
        }
        if (mines >= rows * cols) {
            throw new InvalidBoardConfigException(
                    "Mine count (" + mines + ") must be less than the cell count (" + (rows * cols)
                            + ") so at least one cell — the first click — can always be safe");
        }
    }

    private Game newGame(MinesweeperRepository targetRepository, int rows, int cols, int mines) {
        long id = targetRepository.nextId();
        Game game = new Game(id, rows, cols, mines);
        targetRepository.save(game);
        return game;
    }

    private Game findOrThrow(MinesweeperRepository targetRepository, long id) {
        Game game = targetRepository.get(id);
        if (game == null) throw new GameNotFoundException("Game not found: " + id);
        return game;
    }

    private void requireInBounds(Game game, int row, int col) {
        if (row < 0 || row >= game.getRows() || col < 0 || col >= game.getCols()) {
            throw new InvalidCellException("Cell (" + row + ", " + col + ") is outside the "
                    + game.getRows() + "x" + game.getCols() + " board");
        }
    }

    private void applyReveal(Game game, int row, int col) {
        requireInBounds(game, row, col);
        if (game.getStatus() != GameStatus.PLAYING) {
            throw new GameOverException("Game " + game.getId() + " has already ended: " + game.getStatus());
        }

        if (!game.isFirstClickDone()) {
            minePlacer.place(game.getBoard(), game.getRows(), game.getCols(), game.getTotalMines(), row, col);
            calculateAdjacentCounts(game);
            game.setFirstClickDone(true);
        }

        Cell cell = game.getBoard()[row][col];
        if (cell.isRevealed() || cell.isFlagged()) return;

        if (cell.isMine()) {
            cell.setRevealed(true);
            game.setStatus(GameStatus.LOST);
            return;
        }

        revealRecursive(game, row, col);
        checkWin(game);
    }

    private void applyFlag(Game game, int row, int col) {
        requireInBounds(game, row, col);
        if (game.getStatus() != GameStatus.PLAYING) {
            throw new GameOverException("Game " + game.getId() + " has already ended: " + game.getStatus());
        }

        Cell cell = game.getBoard()[row][col];
        if (cell.isRevealed()) return;

        cell.setFlagged(!cell.isFlagged());
        game.setFlagsUsed(cell.isFlagged() ? game.getFlagsUsed() + 1 : game.getFlagsUsed() - 1);
    }

    private void calculateAdjacentCounts(Game game) {
        Cell[][] board = game.getBoard();
        int rows = game.getRows();
        int cols = game.getCols();
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (board[r][c].isMine()) continue;
                int count = 0;
                for (int d = 0; d < 8; d++) {
                    int nr = r + DR[d];
                    int nc = c + DC[d];
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isMine()) count++;
                }
                board[r][c].setAdjacentMines(count);
            }
        }
    }

    /**
     * Flood-fill: reveals ({@code row}, {@code col}) and, only when it has zero adjacent mines,
     * recurses into all 8 neighbors. A numbered cell (adjacentMines &gt; 0) is revealed as a leaf
     * — it never triggers further recursion, so the cascade stops exactly at the border of an
     * empty region. Bounds are checked before every array access, so an edge/corner cell's
     * off-board neighbors are simply skipped, never indexed.
     */
    private void revealRecursive(Game game, int row, int col) {
        Cell[][] board = game.getBoard();
        int rows = game.getRows();
        int cols = game.getCols();
        if (row < 0 || row >= rows || col < 0 || col >= cols) return;
        Cell cell = board[row][col];
        if (cell.isRevealed() || cell.isFlagged() || cell.isMine()) return;
        cell.setRevealed(true);
        game.setRevealedCount(game.getRevealedCount() + 1);
        if (cell.getAdjacentMines() == 0) {
            for (int d = 0; d < 8; d++) {
                revealRecursive(game, row + DR[d], col + DC[d]);
            }
        }
    }

    /** Win condition: every non-mine cell has been revealed. */
    private void checkWin(Game game) {
        int totalCells = game.getRows() * game.getCols();
        if (game.getRevealedCount() + game.getTotalMines() == totalCells) {
            game.setStatus(GameStatus.WON);
        }
    }

    /** While a game is still being played, hide the mine count on unrevealed mine cells (-1 = unknown to the client). */
    private void maskUnrevealedMineCounts(Game game) {
        if (game.getStatus() != GameStatus.PLAYING) return;
        for (Cell[] row : game.getBoard()) {
            for (Cell cell : row) {
                if (cell.isMine()) cell.setAdjacentMines(-1);
            }
        }
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE (/api/minesweeper/sim/*)
    // =========================================================================

    private static final int SIM_ROWS = 5;
    private static final int SIM_COLS = 5;
    private static final int SIM_MINES = 3;

    public Game simReset() {
        Game game = newGame(simRepository, SIM_ROWS, SIM_COLS, SIM_MINES);
        simGameId = game.getId();
        simEventLog.clear();
        simEventIdGen.set(1);
        logSimEvent(game, "system", "Simulation reset — fresh " + SIM_ROWS + "x" + SIM_COLS + " board, "
                + SIM_MINES + " mines (placed lazily on first reveal).");
        return game;
    }

    public Game simGetGame() {
        if (simGameId == null) return simReset();
        Game game = simRepository.get(simGameId);
        maskUnrevealedMineCounts(game);
        return game;
    }

    public List<SimEvent> simGetEventLog() {
        return new ArrayList<>(simEventLog);
    }

    public Game simReveal(int row, int col) {
        if (simGameId == null) simReset();
        Game game = simRepository.get(simGameId);
        applyReveal(game, row, col);
        logSimEvent(game, "player", "Revealed (" + row + ", " + col + ")");
        return game;
    }

    public Game simFlag(int row, int col) {
        if (simGameId == null) simReset();
        Game game = simRepository.get(simGameId);
        applyFlag(game, row, col);
        logSimEvent(game, "player", "Flagged (" + row + ", " + col + ")");
        return game;
    }

    private void logSimEvent(Game game, String actor, String description) {
        simEventLog.add(SimEvent.builder()
                .id(simEventIdGen.getAndIncrement())
                .timestamp(Instant.now().toString())
                .actor(actor)
                .description(description)
                .status(game.getStatus())
                .revealedCount(game.getRevealedCount())
                .build());
    }
}
