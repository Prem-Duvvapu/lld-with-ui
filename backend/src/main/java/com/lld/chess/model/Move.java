package com.lld.chess.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** One applied half-move, recorded for history/replay and for en-passant timing. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Move {
    private int fromRow;
    private int fromCol;
    private int toRow;
    private int toCol;
    private Piece piece;
    private Piece capturedPiece;
    private PieceType promotedTo;
    private boolean castling;
    private boolean enPassant;
    private boolean promotion;

    public Move(int fromRow, int fromCol, int toRow, int toCol, Piece piece) {
        this.fromRow = fromRow;
        this.fromCol = fromCol;
        this.toRow = toRow;
        this.toCol = toCol;
        this.piece = piece;
    }
}
