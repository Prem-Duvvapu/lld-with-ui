package com.lld.tictactoe.model;

import lombok.Getter;

@Getter
public class Cell {
    private final int row;
    private final int col;
    private Symbol symbol;

    public Cell(int row, int col) {
        this.row = row;
        this.col = col;
        this.symbol = null;
    }

    public void setSymbol(Symbol symbol) { this.symbol = symbol; }

    public boolean isEmpty() {
        return symbol == null;
    }
}
