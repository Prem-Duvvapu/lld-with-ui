package com.lld.chess.model;

/** The two sides. Replaces the "w"/"b" string literals the board used to carry. */
public enum Color {
    WHITE,
    BLACK;

    public Color opposite() {
        return this == WHITE ? BLACK : WHITE;
    }

    /** Index into the two-element player-scoped arrays on {@link Game} (kingMoved, players). */
    public int index() {
        return this == WHITE ? 0 : 1;
    }

    public static Color fromIndex(int index) {
        return index == 0 ? WHITE : BLACK;
    }
}
