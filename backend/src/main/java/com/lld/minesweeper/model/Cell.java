package com.lld.minesweeper.model;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class Cell {
    private int row;
    private int col;
    private boolean mine;
    private boolean revealed;
    private boolean flagged;
    private int adjacentMines;

    public Cell(int row, int col) {
        this.row = row;
        this.col = col;
        this.mine = false;
        this.revealed = false;
        this.flagged = false;
        this.adjacentMines = 0;
    }
}
