package com.lld.chess.model;

import com.fasterxml.jackson.annotation.JsonValue;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;

/**
 * An immutable (type, color) pair occupying a square.
 *
 * <p>Serialized over the wire as the two-character code the frontend already understands
 * (e.g. {@code "wP"}, {@code "bK"}) via {@link JsonValue} — the board's on-the-wire shape is
 * unchanged even though the internal representation is now typed instead of a raw string.
 */
@Getter
@EqualsAndHashCode
@AllArgsConstructor
public class Piece {
    private final PieceType type;
    private final Color color;

    @JsonValue
    public String code() {
        return (color == Color.WHITE ? "w" : "b") + type.code();
    }

    public static Piece of(Color color, PieceType type) {
        return new Piece(type, color);
    }

    public static Piece fromCode(String code) {
        if (code == null || code.length() != 2) {
            throw new IllegalArgumentException("Invalid piece code: " + code);
        }
        Color color = code.charAt(0) == 'w' ? Color.WHITE : Color.BLACK;
        return new Piece(PieceType.fromCode(code.charAt(1)), color);
    }

    @Override
    public String toString() {
        return code();
    }
}
