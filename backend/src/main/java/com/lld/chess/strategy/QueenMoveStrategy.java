package com.lld.chess.strategy;

import com.lld.chess.model.Piece;
import com.lld.chess.model.PieceType;
import org.springframework.stereotype.Component;

@Component
public class QueenMoveStrategy implements PieceMoveStrategy {

    @Override
    public PieceType type() {
        return PieceType.QUEEN;
    }

    @Override
    public boolean isValidMove(Piece[][] board, int fr, int fc, int tr, int tc, MoveContext context) {
        return RookMoveStrategy.slides(board, fr, fc, tr, tc) || BishopMoveStrategy.slidesDiagonally(board, fr, fc, tr, tc);
    }

    @Override
    public boolean attacksSquare(Piece[][] board, int fr, int fc, int tr, int tc) {
        return isValidMove(board, fr, fc, tr, tc, null);
    }
}
