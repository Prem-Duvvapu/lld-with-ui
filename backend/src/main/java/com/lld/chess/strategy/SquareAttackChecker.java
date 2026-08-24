package com.lld.chess.strategy;

import com.lld.chess.model.Color;
import com.lld.chess.model.Piece;

/**
 * Callback the service hands to {@code KingMoveStrategy} so castling can check "does the king
 * pass through an attacked square" without the strategy layer depending back on the service.
 */
@FunctionalInterface
public interface SquareAttackChecker {
    /** True if {@code (row, col)} is attacked by the opponent of {@code defenderColor}. */
    boolean isAttacked(Piece[][] board, int row, int col, Color defenderColor);
}
