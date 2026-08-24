package com.lld.chess.strategy;

import com.lld.chess.model.Piece;
import com.lld.chess.model.PieceType;
import org.springframework.stereotype.Component;

@Component
public class BishopMoveStrategy implements PieceMoveStrategy {

    @Override
    public PieceType type() {
        return PieceType.BISHOP;
    }

    @Override
    public boolean isValidMove(Piece[][] board, int fr, int fc, int tr, int tc, MoveContext context) {
        return slidesDiagonally(board, fr, fc, tr, tc);
    }

    static boolean slidesDiagonally(Piece[][] board, int fr, int fc, int tr, int tc) {
        if (Math.abs(fr - tr) != Math.abs(fc - tc) || fr == tr) return false;
        int dr = tr > fr ? 1 : -1, dc = tc > fc ? 1 : -1;
        int r = fr + dr, c = fc + dc;
        while (r != tr && c != tc) {
            if (board[r][c] != null) return false;
            r += dr;
            c += dc;
        }
        return true;
    }

    @Override
    public boolean attacksSquare(Piece[][] board, int fr, int fc, int tr, int tc) {
        return slidesDiagonally(board, fr, fc, tr, tc);
    }
}
