package com.lld.minesweeper.model;

public class Game {
    private long id;
    private Cell[][] board;
    private int rows;
    private int cols;
    private int totalMines;
    private GameStatus status;
    private int flagsUsed;
    private int revealedCount;

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
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    public Cell[][] getBoard() { return board; }
    public void setBoard(Cell[][] board) { this.board = board; }
    public int getRows() { return rows; }
    public void setRows(int rows) { this.rows = rows; }
    public int getCols() { return cols; }
    public void setCols(int cols) { this.cols = cols; }
    public int getTotalMines() { return totalMines; }
    public void setTotalMines(int totalMines) { this.totalMines = totalMines; }
    public GameStatus getStatus() { return status; }
    public void setStatus(GameStatus status) { this.status = status; }
    public int getFlagsUsed() { return flagsUsed; }
    public void setFlagsUsed(int flagsUsed) { this.flagsUsed = flagsUsed; }
    public int getRevealedCount() { return revealedCount; }
    public void setRevealedCount(int revealedCount) { this.revealedCount = revealedCount; }
}
