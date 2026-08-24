package com.lld.chess.service;

import com.lld.chess.command.ApplyMoveCommand;
import com.lld.chess.exception.GameNotFoundException;
import com.lld.chess.exception.GameOverException;
import com.lld.chess.exception.InvalidMoveException;
import com.lld.chess.exception.MoveIntoCheckException;
import com.lld.chess.exception.NoPieceAtSquareException;
import com.lld.chess.exception.NotYourTurnException;
import com.lld.chess.model.Color;
import com.lld.chess.model.Game;
import com.lld.chess.model.GameStatus;
import com.lld.chess.model.Move;
import com.lld.chess.model.Piece;
import com.lld.chess.model.PieceType;
import com.lld.chess.model.Player;
import com.lld.chess.model.SimEvent;
import com.lld.chess.repository.ChessRepository;
import com.lld.chess.strategy.MoveContext;
import com.lld.chess.strategy.PieceMoveStrategy;
import com.lld.chess.strategy.PieceMoveStrategyFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Facade for the whole module: move legality, check/checkmate/stalemate detection, and the
 * isolated {@code /sim/*} demo engine. The controller only translates HTTP; every rule lives
 * here or in the {@code strategy}/{@code command} packages this class orchestrates.
 *
 * <p>Concurrency: each game gets its own {@link ReentrantLock}, taken for the whole
 * read-validate-mutate span of {@link #makeMove}. Games are independent, so per-game locks
 * (rather than one lock for the module) let unrelated games proceed in parallel while still
 * closing the check-then-act race on any single game — two near-simultaneous move requests for
 * the same game must not both read the pre-move board and both mutate it.
 */
@Service
public class ChessService {
    private final ChessRepository repository;
    private final PieceMoveStrategyFactory strategyFactory;
    private final Map<Long, ReentrantLock> gameLocks = new ConcurrentHashMap<>();

    // Isolated simulation engine — a separate repository instance so the demo cannot
    // corrupt real game state, mirroring concertticket's simRepository pattern.
    private final ChessRepository simRepository = new ChessRepository();
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);
    private volatile long simGameId = -1;

    public ChessService(ChessRepository repository, PieceMoveStrategyFactory strategyFactory) {
        this.repository = repository;
        this.strategyFactory = strategyFactory;
    }

    // =========================================================================
    // LIVE GAME API
    // =========================================================================

    public Game createGame(String playerWhite, String playerBlack) {
        long id = repository.nextId();
        Game game = newGame(id, playerWhite, playerBlack);
        repository.save(game);
        return game;
    }

    public Game getGame(long id) {
        Game game = repository.get(id);
        if (game == null) throw new GameNotFoundException("Game not found: " + id);
        return game;
    }

    public Game makeMove(long gameId, int fromRow, int fromCol, int toRow, int toCol, PieceType promotionType) {
        ReentrantLock lock = gameLocks.computeIfAbsent(gameId, id -> new ReentrantLock());
        lock.lock();
        try {
            Game game = getGame(gameId);
            applyMove(game, fromRow, fromCol, toRow, toCol, promotionType);
            return game;
        } finally {
            lock.unlock();
        }
    }

    public List<int[]> getValidMoves(long gameId, int row, int col) {
        Game game = getGame(gameId);
        Piece piece = game.getBoard()[row][col];
        if (piece == null) return List.of();
        List<int[]> valid = new ArrayList<>();
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                if (isLegalMove(game, row, col, r, c)) {
                    valid.add(new int[]{r, c});
                }
            }
        }
        return valid;
    }

    public Game resign(long gameId, Color resigningColor) {
        ReentrantLock lock = gameLocks.computeIfAbsent(gameId, id -> new ReentrantLock());
        lock.lock();
        try {
            Game game = getGame(gameId);
            if (game.getStatus().isTerminal()) throw new GameOverException("Game is over");
            game.setStatus(GameStatus.RESIGNED);
            game.setWinner(game.getPlayers()[resigningColor.opposite().index()].getName());
            return game;
        } finally {
            lock.unlock();
        }
    }

    // =========================================================================
    // MOVE APPLICATION (shared by the live API and the sim engine)
    // =========================================================================

    private Game newGame(long id, String playerWhite, String playerBlack) {
        Player white = new Player(1, playerWhite, Color.WHITE);
        Player black = new Player(2, playerBlack, Color.BLACK);
        return new Game(id, white, black);
    }

    private void applyMove(Game game, int fromRow, int fromCol, int toRow, int toCol, PieceType promotionType) {
        if (game.getStatus().isTerminal()) {
            throw new GameOverException("Game is over");
        }
        Piece piece = game.getBoard()[fromRow][fromCol];
        if (piece == null) throw new NoPieceAtSquareException("No piece at source");
        if (piece.getColor() != game.currentColor()) throw new NotYourTurnException("Not your turn");

        if (!isShapeValid(game, fromRow, fromCol, toRow, toCol)) {
            throw new InvalidMoveException("Invalid move for " + piece.getType());
        }
        if (leavesOwnKingInCheck(game, fromRow, fromCol, toRow, toCol)) {
            throw new MoveIntoCheckException("Move would leave your own king in check");
        }

        new ApplyMoveCommand(game, fromRow, fromCol, toRow, toCol, promotionType).execute();

        int nextIdx = game.getCurrentPlayerIndex() == 0 ? 1 : 0;
        game.setCurrentPlayerIndex(nextIdx);
        game.setStatus(computeStatus(game, Color.fromIndex(nextIdx)));
        if (game.getStatus() == GameStatus.CHECKMATE) {
            game.setWinner(game.getPlayers()[game.getCurrentPlayerIndex() == 0 ? 1 : 0].getName());
        }
    }

    private GameStatus computeStatus(Game game, Color toMove) {
        boolean inCheck = isInCheck(game, toMove);
        boolean hasMove = hasLegalMove(game, toMove);
        if (inCheck) return hasMove ? GameStatus.CHECK : GameStatus.CHECKMATE;
        return hasMove ? GameStatus.ACTIVE : GameStatus.STALEMATE;
    }

    // =========================================================================
    // MOVE LEGALITY
    // =========================================================================

    private boolean isLegalMove(Game game, int fromRow, int fromCol, int toRow, int toCol) {
        return isShapeValid(game, fromRow, fromCol, toRow, toCol)
                && !leavesOwnKingInCheck(game, fromRow, fromCol, toRow, toCol);
    }

    /** Bounds, own-piece-capture, and the piece type's own shape/path/blocking rules. */
    private boolean isShapeValid(Game game, int fromRow, int fromCol, int toRow, int toCol) {
        if (!inBounds(fromRow, fromCol) || !inBounds(toRow, toCol)) return false;
        Piece[][] board = game.getBoard();
        Piece piece = board[fromRow][fromCol];
        if (piece == null) return false;
        Piece target = board[toRow][toCol];
        if (target != null && target.getColor() == piece.getColor()) return false;

        PieceMoveStrategy strategy = strategyFactory.forType(piece.getType());
        MoveContext context = new MoveContext(game.getKingMoved(), game.getRookMoved(),
                game.getEnPassantTarget(), this::isSquareAttacked);
        return strategy.isValidMove(board, fromRow, fromCol, toRow, toCol, context);
    }

    /** Simulates the move (including an en-passant capture) and checks the mover's own king. */
    private boolean leavesOwnKingInCheck(Game game, int fromRow, int fromCol, int toRow, int toCol) {
        Piece[][] board = game.getBoard();
        Piece piece = board[fromRow][fromCol];
        Piece target = board[toRow][toCol];

        Piece[][] simBoard = cloneBoard(board);
        simBoard[toRow][toCol] = simBoard[fromRow][fromCol];
        simBoard[fromRow][fromCol] = null;
        if (piece.getType() == PieceType.PAWN && fromCol != toCol && target == null) {
            simBoard[fromRow][toCol] = null;
        }
        return isInCheckOnBoard(simBoard, piece.getColor());
    }

    private boolean inBounds(int row, int col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    private boolean isInCheck(Game game, Color color) {
        return isInCheckOnBoard(game.getBoard(), color);
    }

    private boolean isInCheckOnBoard(Piece[][] board, Color color) {
        int kr = -1, kc = -1;
        for (int r = 0; r < 8 && kr == -1; r++) {
            for (int c = 0; c < 8 && kr == -1; c++) {
                Piece p = board[r][c];
                if (p != null && p.getType() == PieceType.KING && p.getColor() == color) {
                    kr = r;
                    kc = c;
                }
            }
        }
        if (kr == -1) return true;
        return isSquareAttacked(board, kr, kc, color);
    }

    private boolean isSquareAttacked(Piece[][] board, int row, int col, Color defenderColor) {
        Color enemy = defenderColor.opposite();
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                Piece p = board[r][c];
                if (p == null || p.getColor() != enemy) continue;
                PieceMoveStrategy strategy = strategyFactory.forType(p.getType());
                if (strategy.attacksSquare(board, r, c, row, col)) return true;
            }
        }
        return false;
    }

    private boolean hasLegalMove(Game game, Color color) {
        Piece[][] board = game.getBoard();
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                Piece p = board[r][c];
                if (p != null && p.getColor() == color) {
                    for (int tr = 0; tr < 8; tr++) {
                        for (int tc = 0; tc < 8; tc++) {
                            if (isLegalMove(game, r, c, tr, tc)) return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    private Piece[][] cloneBoard(Piece[][] board) {
        Piece[][] copy = new Piece[8][8];
        for (int r = 0; r < 8; r++) System.arraycopy(board[r], 0, copy[r], 0, 8);
        return copy;
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE (/api/chess/sim/*)
    // =========================================================================

    public Game simReset() {
        long id = simRepository.nextId();
        Game game = newGame(id, "Magnus", "Hikaru");
        simRepository.save(game);
        simGameId = id;
        simEventLog.clear();
        simEventIdGen.set(1);
        logSimEvent(game, "system", "Simulation reset — fresh game, standard starting position.");
        return game;
    }

    public Game simGetGame() {
        if (simGameId < 0) return simReset();
        return simRepository.get(simGameId);
    }

    public List<SimEvent> simGetEventLog() {
        return new ArrayList<>(simEventLog);
    }

    public Game simMove(int fromRow, int fromCol, int toRow, int toCol, String description) {
        if (simGameId < 0) simReset();
        Game game = simRepository.get(simGameId);
        Piece mover = game.getBoard()[fromRow][fromCol];
        applyMove(game, fromRow, fromCol, toRow, toCol, null);
        String actor = mover != null ? mover.getColor().name() : "unknown";
        logSimEvent(game, actor, description);
        return game;
    }

    private void logSimEvent(Game game, String actor, String description) {
        simEventLog.add(SimEvent.builder()
                .id(simEventIdGen.getAndIncrement())
                .timestamp(Instant.now().toString())
                .actor(actor)
                .description(description)
                .boardSnapshot(cloneBoard(game.getBoard()))
                .status(game.getStatus())
                .build());
    }
}
