package com.lld.chess.strategy;

/**
 * Everything beyond raw board state a piece may need to decide its own legality:
 * castling rights (king/rook-moved flags), the current en-passant target square (or null),
 * and a callback to ask whether a square is under attack (needed only by the king, for
 * castling's "may not pass through check" rule).
 */
public record MoveContext(boolean[] kingMoved, boolean[] rookMoved, int[] enPassantTarget,
                           SquareAttackChecker attackChecker) {
}
