package com.lld.chess.strategy;

import com.lld.chess.model.Piece;
import com.lld.chess.model.PieceType;

/**
 * One piece type's movement rules. Implementations check the piece's own shape/path/blocking
 * rules only — they never decide whether the move leaves the mover's own king in check, and
 * {@link #isValidMove} never checks whether the destination holds a friendly piece; both of
 * those are cross-cutting rules the service applies uniformly to every piece type.
 */
public interface PieceMoveStrategy {

    PieceType type();

    /** Movement-pattern legality: shape, path-blocking, and (pawn/king only) special rules. */
    boolean isValidMove(Piece[][] board, int fromRow, int fromCol, int toRow, int toCol, MoveContext context);

    /**
     * Raw attack pattern: could this piece capture on {@code (toRow, toCol)} next turn, ignoring
     * whose turn it is and ignoring check safety? Differs from {@link #isValidMove} for pawns
     * (attacks diagonally regardless of occupancy; never attacks straight ahead) and kings
     * (never "attacks" via castling).
     */
    boolean attacksSquare(Piece[][] board, int fromRow, int fromCol, int toRow, int toCol);
}
