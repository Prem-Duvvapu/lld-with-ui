package com.lld.tictactoe.model;

public class Move {
    private final int moveNumber;
    private final String playerName;
    private final Symbol symbol;
    private final int row;
    private final int col;
    private final long timestamp;

    public Move(int moveNumber, String playerName, Symbol symbol, int row, int col) {
        this.moveNumber = moveNumber;
        this.playerName = playerName;
        this.symbol = symbol;
        this.row = row;
        this.col = col;
        this.timestamp = System.currentTimeMillis();
    }

    public int getMoveNumber() { return moveNumber; }
    public String getPlayerName() { return playerName; }
    public Symbol getSymbol() { return symbol; }
    public int getRow() { return row; }
    public int getCol() { return col; }
    public long getTimestamp() { return timestamp; }
}
