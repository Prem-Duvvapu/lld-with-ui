package com.lld.tictactoe.model;

public enum Symbol {
    X,
    O;

    public static Symbol fromString(String str) {
        if (str == null || str.trim().isEmpty()) return null;
        return Symbol.valueOf(str.trim().toUpperCase());
    }
}
