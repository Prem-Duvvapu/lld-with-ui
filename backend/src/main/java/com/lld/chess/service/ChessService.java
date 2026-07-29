package com.lld.chess.service;

import com.lld.chess.model.*;
import com.lld.chess.repository.ChessRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class ChessService {
    private final ChessRepository repository;
    private final ReentrantLock lock = new ReentrantLock();

    public ChessService(ChessRepository repository) {
        this.repository = repository;
    }

    public Game createGame(String playerWhite, String playerBlack) {
        lock.lock();
        try {
            long id = repository.nextId();
            Player white = new Player(1, playerWhite, "WHITE");
            Player black = new Player(2, playerBlack, "BLACK");
            Game game = new Game(id, white, black);
            repository.save(game);
            return game;
        } finally {
            lock.unlock();
        }
    }

    public Game getGame(long id) {
        Game game = repository.get(id);
        if (game == null) throw new IllegalArgumentException("Game not found: " + id);
        return game;
    }

    public Game makeMove(long gameId, int fromRow, int fromCol, int toRow, int toCol) {
        lock.lock();
        try {
            Game game = getGame(gameId);
            if (game.getStatus() == GameStatus.CHECKMATE || game.getStatus() == GameStatus.DRAW || game.getStatus() == GameStatus.STALEMATE) {
                throw new IllegalStateException("Game is over");
            }

            String piece = game.getBoard()[fromRow][fromCol];
            if (piece == null) throw new IllegalStateException("No piece at source");
            String color = piece.substring(0, 1);
            String expectedColor = game.getCurrentPlayerIndex() == 0 ? "w" : "b";
            if (!color.equals(expectedColor)) throw new IllegalStateException("Not your turn");

            if (!isValidMove(game, fromRow, fromCol, toRow, toCol)) {
                throw new IllegalStateException("Invalid move");
            }

            Move move = new Move(fromRow, fromCol, toRow, toCol, piece);
            String captured = game.getBoard()[toRow][toCol];
            if (captured != null) move.setCapturedPiece(captured);

            game.getBoard()[toRow][toCol] = piece;
            game.getBoard()[fromRow][fromCol] = null;

            if (piece.charAt(1) == 'K') {
                game.getKingMoved()[game.getCurrentPlayerIndex()] = true;
                if (Math.abs(toCol - fromCol) == 2) {
                    move.setCastling(true);
                    if (toCol > fromCol) {
                        game.getBoard()[fromRow][5] = game.getBoard()[fromRow][7];
                        game.getBoard()[fromRow][7] = null;
                    } else {
                        game.getBoard()[fromRow][3] = game.getBoard()[fromRow][0];
                        game.getBoard()[fromRow][0] = null;
                    }
                }
            }
            if (piece.charAt(1) == 'R') {
                if (fromRow == 0) {
                    if (fromCol == 0) game.getRookMoved()[1] = true;
                    else if (fromCol == 7) game.getRookMoved()[3] = true;
                } else if (fromRow == 7) {
                    if (fromCol == 0) game.getRookMoved()[0] = true;
                    else if (fromCol == 7) game.getRookMoved()[2] = true;
                }
            }

            game.getMoveHistory().add(move);
            int nextIdx = game.getCurrentPlayerIndex() == 0 ? 1 : 0;
            game.setCurrentPlayerIndex(nextIdx);

            if (isInCheck(game, nextIdx == 0 ? "w" : "b")) {
                if (isCheckmate(game, nextIdx == 0 ? "w" : "b")) {
                    game.setStatus(GameStatus.CHECKMATE);
                    game.setWinner(game.getPlayers()[game.getCurrentPlayerIndex() == 0 ? 1 : 0].getName());
                } else {
                    game.setStatus(GameStatus.CHECK);
                }
            } else {
                if (isStalemate(game, nextIdx == 0 ? "w" : "b")) {
                    game.setStatus(GameStatus.STALEMATE);
                } else {
                    game.setStatus(GameStatus.ACTIVE);
                }
            }

            return game;
        } finally {
            lock.unlock();
        }
    }

    public List<int[]> getValidMoves(long gameId, int row, int col) {
        Game game = getGame(gameId);
        String piece = game.getBoard()[row][col];
        if (piece == null) return List.of();
        List<int[]> valid = new ArrayList<>();
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                if (isValidMove(game, row, col, r, c)) {
                    valid.add(new int[]{r, c});
                }
            }
        }
        return valid;
    }

    private boolean isValidMove(Game game, int fromRow, int fromCol, int toRow, int toCol) {
        if (fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7 || toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;
        String piece = game.getBoard()[fromRow][fromCol];
        if (piece == null) return false;
        String target = game.getBoard()[toRow][toCol];
        String color = piece.substring(0, 1);
        if (target != null && target.substring(0, 1).equals(color)) return false;

        String[][] board = game.getBoard();
        char type = piece.charAt(1);

        boolean basicValid = switch (type) {
            case 'P' -> isValidPawnMove(board, fromRow, fromCol, toRow, toCol, color);
            case 'R' -> isValidRookMove(board, fromRow, fromCol, toRow, toCol);
            case 'N' -> isValidKnightMove(fromRow, fromCol, toRow, toCol);
            case 'B' -> isValidBishopMove(board, fromRow, fromCol, toRow, toCol);
            case 'Q' -> isValidQueenMove(board, fromRow, fromCol, toRow, toCol);
            case 'K' -> isValidKingMove(board, fromRow, fromCol, toRow, toCol, color, game);
            default -> false;
        };

        if (!basicValid) return false;

        String[][] simBoard = cloneBoard(board);
        simBoard[toRow][toCol] = simBoard[fromRow][fromCol];
        simBoard[fromRow][fromCol] = null;
        return !isInCheckOnBoard(simBoard, color);
    }

    private boolean isValidPawnMove(String[][] board, int fr, int fc, int tr, int tc, String color) {
        int dir = color.equals("w") ? -1 : 1;
        int startRow = color.equals("w") ? 6 : 1;

        if (fc == tc && board[tr][tc] == null) {
            if (tr == fr + dir) return true;
            if (fr == startRow && tr == fr + 2 * dir && board[fr + dir][fc] == null) return true;
        }
        if (Math.abs(tc - fc) == 1 && tr == fr + dir && board[tr][tc] != null) return true;

        return false;
    }

    private boolean isValidRookMove(String[][] board, int fr, int fc, int tr, int tc) {
        if (fr != tr && fc != tc) return false;
        if (fr == tr) {
            int min = Math.min(fc, tc), max = Math.max(fc, tc);
            for (int c = min + 1; c < max; c++) if (board[fr][c] != null) return false;
        } else {
            int min = Math.min(fr, tr), max = Math.max(fr, tr);
            for (int r = min + 1; r < max; r++) if (board[r][fc] != null) return false;
        }
        return true;
    }

    private boolean isValidKnightMove(int fr, int fc, int tr, int tc) {
        int dr = Math.abs(fr - tr), dc = Math.abs(fc - tc);
        return (dr == 2 && dc == 1) || (dr == 1 && dc == 2);
    }

    private boolean isValidBishopMove(String[][] board, int fr, int fc, int tr, int tc) {
        if (Math.abs(fr - tr) != Math.abs(fc - tc)) return false;
        int dr = tr > fr ? 1 : -1, dc = tc > fc ? 1 : -1;
        int r = fr + dr, c = fc + dc;
        while (r != tr && c != tc) {
            if (board[r][c] != null) return false;
            r += dr; c += dc;
        }
        return true;
    }

    private boolean isValidQueenMove(String[][] board, int fr, int fc, int tr, int tc) {
        return isValidRookMove(board, fr, fc, tr, tc) || isValidBishopMove(board, fr, fc, tr, tc);
    }

    private boolean isValidKingMove(String[][] board, int fr, int fc, int tr, int tc, String color, Game game) {
        int dr = Math.abs(fr - tr), dc = Math.abs(fc - tc);
        if (dr <= 1 && dc <= 1) return true;
        if (dr == 0 && dc == 2 && !game.getKingMoved()[color.equals("w") ? 0 : 1]) {
            int row = color.equals("w") ? 7 : 0;
            if (fr != row) return false;
            if (tc > fc && !game.getRookMoved()[color.equals("w") ? 2 : 3] && board[row][5] == null && board[row][6] == null && board[row][7] != null && board[row][7].equals(color + "R")) {
                return !isInCheckOnBoard(board, color) && !isSquareAttacked(board, row, 5, color) && !isSquareAttacked(board, row, 6, color);
            }
            if (tc < fc && !game.getRookMoved()[color.equals("w") ? 0 : 1] && board[row][3] == null && board[row][2] == null && board[row][1] == null && board[row][0] != null && board[row][0].equals(color + "R")) {
                return !isInCheckOnBoard(board, color) && !isSquareAttacked(board, row, 3, color) && !isSquareAttacked(board, row, 2, color);
            }
        }
        return false;
    }

    private boolean isInCheck(Game game, String color) {
        return isInCheckOnBoard(game.getBoard(), color);
    }

    private boolean isInCheckOnBoard(String[][] board, String color) {
        int kr = -1, kc = -1;
        for (int r = 0; r < 8 && kr == -1; r++) {
            for (int c = 0; c < 8 && kr == -1; c++) {
                if (board[r][c] != null && board[r][c].equals(color + "K")) { kr = r; kc = c; }
            }
        }
        if (kr == -1) return true;
        return isSquareAttacked(board, kr, kc, color);
    }

    private boolean isSquareAttacked(String[][] board, int row, int col, String color) {
        String enemy = color.equals("w") ? "b" : "w";
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                String p = board[r][c];
                if (p == null || !p.substring(0, 1).equals(enemy)) continue;
                char type = p.charAt(1);
                boolean attacks = switch (type) {
                    case 'P' -> Math.abs(c - col) == 1 && row - r == (enemy.equals("w") ? -1 : 1);
                    case 'N' -> (Math.abs(r - row) == 2 && Math.abs(c - col) == 1) || (Math.abs(r - row) == 1 && Math.abs(c - col) == 2);
                    case 'B' -> isValidBishopMove(board, r, c, row, col);
                    case 'R' -> isValidRookMove(board, r, c, row, col);
                    case 'Q' -> isValidQueenMove(board, r, c, row, col);
                    case 'K' -> Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1;
                    default -> false;
                };
                if (attacks) return true;
            }
        }
        return false;
    }

    private boolean isCheckmate(Game game, String color) {
        return isInCheck(game, color) && !hasLegalMove(game, color);
    }

    private boolean isStalemate(Game game, String color) {
        return !isInCheck(game, color) && !hasLegalMove(game, color);
    }

    private boolean hasLegalMove(Game game, String color) {
        String[][] board = game.getBoard();
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                String p = board[r][c];
                if (p != null && p.substring(0, 1).equals(color)) {
                    for (int tr = 0; tr < 8; tr++) {
                        for (int tc = 0; tc < 8; tc++) {
                            if (isValidMove(game, r, c, tr, tc)) return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    private String[][] cloneBoard(String[][] board) {
        String[][] copy = new String[8][8];
        for (int r = 0; r < 8; r++) System.arraycopy(board[r], 0, copy[r], 0, 8);
        return copy;
    }
}