package com.lld.tictactoe.model;

public class Board {
    private final Cell[][] grid;
    private final int size;

    public Board(int size) {
        this.size = size > 0 ? size : 3;
        this.grid = new Cell[this.size][this.size];
        for (int r = 0; r < this.size; r++) {
            for (int c = 0; c < this.size; c++) {
                grid[r][c] = new Cell(r, c);
            }
        }
    }

    public int getSize() { return size; }
    public Cell[][] getGrid() { return grid; }

    public boolean isCellEmpty(int row, int col) {
        if (row < 0 || row >= size || col < 0 || col >= size) return false;
        return grid[row][col].isEmpty();
    }

    public boolean setCell(int row, int col, Symbol symbol) {
        if (!isCellEmpty(row, col)) return false;
        grid[row][col].setSymbol(symbol);
        return true;
    }

    public void clearCell(int row, int col) {
        if (row >= 0 && row < size && col >= 0 && col < size) {
            grid[row][col].setSymbol(null);
        }
    }

    public boolean isFull() {
        for (int r = 0; r < size; r++) {
            for (int c = 0; c < size; c++) {
                if (grid[r][c].isEmpty()) return false;
            }
        }
        return true;
    }

    public int[] checkWinLine(Symbol symbol) {
        if (symbol == null) return null;

        // Check Rows
        for (int r = 0; r < size; r++) {
            boolean win = true;
            for (int c = 0; c < size; c++) {
                if (grid[r][c].getSymbol() != symbol) { win = false; break; }
            }
            if (win) return new int[]{r, 0, r, size - 1};
        }

        // Check Columns
        for (int c = 0; c < size; c++) {
            boolean win = true;
            for (int r = 0; r < size; r++) {
                if (grid[r][c].getSymbol() != symbol) { win = false; break; }
            }
            if (win) return new int[]{0, c, size - 1, c};
        }

        // Main Diagonal
        boolean mainDiagWin = true;
        for (int i = 0; i < size; i++) {
            if (grid[i][i].getSymbol() != symbol) { mainDiagWin = false; break; }
        }
        if (mainDiagWin) return new int[]{0, 0, size - 1, size - 1};

        // Anti Diagonal
        boolean antiDiagWin = true;
        for (int i = 0; i < size; i++) {
            if (grid[i][size - 1 - i].getSymbol() != symbol) { antiDiagWin = false; break; }
        }
        if (antiDiagWin) return new int[]{0, size - 1, size - 1, 0};

        return null;
    }

    public String[][] toMatrix() {
        String[][] matrix = new String[size][size];
        for (int r = 0; r < size; r++) {
            for (int c = 0; c < size; c++) {
                matrix[r][c] = grid[r][c].getSymbol() == null ? "" : grid[r][c].getSymbol().name();
            }
        }
        return matrix;
    }

    public void reset() {
        for (int r = 0; r < size; r++) {
            for (int c = 0; c < size; c++) {
                grid[r][c].setSymbol(null);
            }
        }
    }
}
