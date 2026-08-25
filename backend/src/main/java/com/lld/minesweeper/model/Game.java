package com.lld.minesweeper.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class Game {
    private long id;
    private Cell[][] board;
    private int rows;
    private int cols;
    private int totalMines;
    private GameStatus status;
    private int flagsUsed;
    private int revealedCount;
    /**
     * First-click-safe policy: mines are placed lazily, on the first {@code revealCell} call,
     * excluding the clicked cell — so the very first cell a player reveals can never be a mine.
     * Until this flips true the board holds zero mines and every {@code adjacentMines} is 0.
     */
    private boolean firstClickDone;

    public Game() {}

    public Game(long id, int rows, int cols, int totalMines) {
        this.id = id;
        this.rows = rows;
        this.cols = cols;
        this.totalMines = totalMines;
        this.board = new Cell[rows][cols];
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++)
                board[r][c] = new Cell(r, c);
        this.status = GameStatus.PLAYING;
        this.flagsUsed = 0;
        this.revealedCount = 0;
        this.firstClickDone = false;
    }
}
