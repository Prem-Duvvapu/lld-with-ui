package com.lld.chess.strategy;

import com.lld.chess.model.Color;
import com.lld.chess.model.Piece;
import com.lld.chess.model.PieceType;
import org.springframework.stereotype.Component;

/**
 * King movement: one square any direction, plus castling.
 *
 * <p>Castling's illegality conditions, all enforced here: the king or the relevant rook has
 * already moved, a square between them is occupied, the king is currently in check, or the
 * king would pass through (or land on) an attacked square.
 */
@Component
public class KingMoveStrategy implements PieceMoveStrategy {

    @Override
    public PieceType type() {
        return PieceType.KING;
    }

    @Override
    public boolean isValidMove(Piece[][] board, int fr, int fc, int tr, int tc, MoveContext context) {
        int dr = Math.abs(fr - tr), dc = Math.abs(fc - tc);
        if (dr <= 1 && dc <= 1 && (dr != 0 || dc != 0)) return true;
        if (dr == 0 && dc == 2) return canCastle(board, fr, fc, tc, context);
        return false;
    }

    private boolean canCastle(Piece[][] board, int fr, int fc, int tc, MoveContext context) {
        Color color = board[fr][fc].getColor();
        if (context.kingMoved()[color.index()]) return false;
        int row = color == Color.WHITE ? 7 : 0;
        if (fr != row) return false;

        boolean kingside = tc > fc;
        int rookIndex = color.index() + (kingside ? 2 : 0);
        int rookCol = kingside ? 7 : 0;
        if (context.rookMoved()[rookIndex]) return false;
        Piece rook = board[row][rookCol];
        if (rook == null || rook.getType() != PieceType.ROOK || rook.getColor() != color) return false;

        int start = Math.min(fc, rookCol) + 1;
        int end = Math.max(fc, rookCol) - 1;
        for (int c = start; c <= end; c++) {
            if (board[row][c] != null) return false;
        }

        if (context.attackChecker().isAttacked(board, fr, fc, color)) return false;
        int step = kingside ? 1 : -1;
        int passThrough = fc + step;
        int landing = fc + 2 * step;
        return !context.attackChecker().isAttacked(board, row, passThrough, color)
                && !context.attackChecker().isAttacked(board, row, landing, color);
    }

    @Override
    public boolean attacksSquare(Piece[][] board, int fr, int fc, int tr, int tc) {
        int dr = Math.abs(fr - tr), dc = Math.abs(fc - tc);
        return dr <= 1 && dc <= 1 && (dr != 0 || dc != 0);
    }
}
