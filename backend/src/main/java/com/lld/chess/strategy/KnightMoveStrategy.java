package com.lld.chess.strategy;

import com.lld.chess.model.Piece;
import com.lld.chess.model.PieceType;
import org.springframework.stereotype.Component;

@Component
public class KnightMoveStrategy implements PieceMoveStrategy {

    @Override
    public PieceType type() {
        return PieceType.KNIGHT;
    }

    @Override
    public boolean isValidMove(Piece[][] board, int fr, int fc, int tr, int tc, MoveContext context) {
        return shapesL(fr, fc, tr, tc);
    }

    static boolean shapesL(int fr, int fc, int tr, int tc) {
        int dr = Math.abs(fr - tr), dc = Math.abs(fc - tc);
        return (dr == 2 && dc == 1) || (dr == 1 && dc == 2);
    }

    @Override
    public boolean attacksSquare(Piece[][] board, int fr, int fc, int tr, int tc) {
        return shapesL(fr, fc, tr, tc);
    }
}
