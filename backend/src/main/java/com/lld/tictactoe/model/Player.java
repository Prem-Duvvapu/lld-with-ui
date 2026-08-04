package com.lld.tictactoe.model;

import java.util.Objects;

public class Player {
    private String name;
    private Symbol symbol;

    public Player() {}

    public Player(String name, Symbol symbol) {
        this.name = name;
        this.symbol = symbol;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Symbol getSymbol() { return symbol; }
    public void setSymbol(Symbol symbol) { this.symbol = symbol; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Player player = (Player) o;
        return Objects.equals(name, player.name) && symbol == player.symbol;
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, symbol);
    }
}
