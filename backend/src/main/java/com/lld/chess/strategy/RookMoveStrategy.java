package com.lld.chess.strategy;

import com.lld.chess.model.Piece;
import com.lld.chess.model.PieceType;
import org.springframework.stereotype.Component;

@Component
public class RookMoveStrategy implements PieceMoveStrategy {

    @Override
    public PieceType type() {
        return PieceType.ROOK;
    }

    @Override
    public boolean isValidMove(Piece[][] board, int fr, int fc, int tr, int tc, MoveContext context) {
        return slides(board, fr, fc, tr, tc);
    }

    static boolean slides(Piece[][] board, int fr, int fc, int tr, int tc) {
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

    @Override
    public boolean attacksSquare(Piece[][] board, int fr, int fc, int tr, int tc) {
        return slides(board, fr, fc, tr, tc);
    }
}
