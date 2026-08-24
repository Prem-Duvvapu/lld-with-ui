package com.lld.chess.strategy;

import com.lld.chess.model.Color;
import com.lld.chess.model.Piece;
import com.lld.chess.model.PieceType;
import org.springframework.stereotype.Component;

@Component
public class PawnMoveStrategy implements PieceMoveStrategy {

    @Override
    public PieceType type() {
        return PieceType.PAWN;
    }

    @Override
    public boolean isValidMove(Piece[][] board, int fr, int fc, int tr, int tc, MoveContext context) {
        Color color = board[fr][fc].getColor();
        int dir = color == Color.WHITE ? -1 : 1;
        int startRow = color == Color.WHITE ? 6 : 1;

        if (fc == tc && board[tr][tc] == null) {
            if (tr == fr + dir) return true;
            if (fr == startRow && tr == fr + 2 * dir && board[fr + dir][fc] == null) return true;
            return false;
        }
        if (Math.abs(tc - fc) == 1 && tr == fr + dir) {
            if (board[tr][tc] != null) return true;
            int[] ep = context.enPassantTarget();
            return ep != null && ep[0] == tr && ep[1] == tc;
        }
        return false;
    }

    @Override
    public boolean attacksSquare(Piece[][] board, int fr, int fc, int tr, int tc) {
        Color color = board[fr][fc].getColor();
        int dir = color == Color.WHITE ? -1 : 1;
        return Math.abs(tc - fc) == 1 && (tr - fr) == dir;
    }
}
