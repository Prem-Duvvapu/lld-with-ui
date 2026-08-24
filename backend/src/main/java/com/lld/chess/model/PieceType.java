package com.lld.chess.model;

/** Typed piece kind, replacing the second character of the old "wP"/"bK" board-cell strings. */
public enum PieceType {
    KING('K'),
    QUEEN('Q'),
    ROOK('R'),
    BISHOP('B'),
    KNIGHT('N'),
    PAWN('P');

    private final char code;

    PieceType(char code) {
        this.code = code;
    }

    public char code() {
        return code;
    }

    public static PieceType fromCode(char code) {
        for (PieceType type : values()) {
            if (type.code == code) return type;
        }
        throw new IllegalArgumentException("Unknown piece code: " + code);
    }
}
