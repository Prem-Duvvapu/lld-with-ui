package com.lld.tictactoe.model;

public class Player {
    private String name;
    private Symbol symbol;
    public enum Symbol { X, O }

    public Player(String name, Symbol symbol) {
        this.name = name;
        this.symbol = symbol;
    }

    public String getName() { return name; }
    public Symbol getSymbol() { return symbol; }
}
