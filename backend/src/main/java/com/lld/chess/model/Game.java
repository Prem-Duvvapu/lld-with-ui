package com.lld.chess.model;

import java.util.ArrayList;
import java.util.List;

public class Game {
    private long id;
    private String[][] board;
    private Player[] players;
    private int currentPlayerIndex;
    private GameStatus status;
    private String winner;
    private List<Move> moveHistory;
    private boolean[] kingMoved;
    private boolean[] rookMoved;

    public Game() {}

    public Game(long id, Player white, Player black) {
        this.id = id;
        this.players = new Player[]{white, black};
        this.currentPlayerIndex = 0;
        this.status = GameStatus.ACTIVE;
        this.moveHistory = new ArrayList<>();
        this.kingMoved = new boolean[2];
        this.rookMoved = new boolean[4];
        this.board = new String[8][8];
        initBoard();
    }

    private void initBoard() {
        String[] backRank = {"bR","bN","bB","bQ","bK","bB","bN","bR"};
        for (int c = 0; c < 8; c++) {
            board[0][c] = backRank[c];
            board[1][c] = "bP";
            board[6][c] = "wP";
            board[7][c] = backRank[c].replace('b', 'w');
        }
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    public String[][] getBoard() { return board; }
    public void setBoard(String[][] board) { this.board = board; }
    public Player[] getPlayers() { return players; }
    public void setPlayers(Player[] players) { this.players = players; }
    public int getCurrentPlayerIndex() { return currentPlayerIndex; }
    public void setCurrentPlayerIndex(int currentPlayerIndex) { this.currentPlayerIndex = currentPlayerIndex; }
    public GameStatus getStatus() { return status; }
    public void setStatus(GameStatus status) { this.status = status; }
    public String getWinner() { return winner; }
    public void setWinner(String winner) { this.winner = winner; }
    public List<Move> getMoveHistory() { return moveHistory; }
    public void setMoveHistory(List<Move> moveHistory) { this.moveHistory = moveHistory; }
    public boolean[] getKingMoved() { return kingMoved; }
    public boolean[] getRookMoved() { return rookMoved; }
}