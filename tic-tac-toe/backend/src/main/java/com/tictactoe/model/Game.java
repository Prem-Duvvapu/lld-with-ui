package com.tictactoe.model;

import java.util.Arrays;

public class Game {
    private String id;
    private Player player1;
    private Player player2;
    private String[][] board;
    private Player currentTurn;
    private GameState state;
    private Player winner;
    private int moveCount;

    public Game(String id, String player1Name, String player2Name) {
        this.id = id;
        this.player1 = new Player(player1Name, Player.Symbol.X);
        this.player2 = new Player(player2Name, Player.Symbol.O);
        this.board = new String[3][3];
        for (int i = 0; i < 3; i++) Arrays.fill(board[i], "");
        this.currentTurn = player1;
        this.state = GameState.IN_PROGRESS;
        this.moveCount = 0;
    }

    public String getId() { return id; }
    public Player getPlayer1() { return player1; }
    public Player getPlayer2() { return player2; }
    public String[][] getBoard() { return board; }
    public Player getCurrentTurn() { return currentTurn; }
    public GameState getState() { return state; }
    public void setState(GameState state) { this.state = state; }
    public Player getWinner() { return winner; }
    public void setWinner(Player winner) { this.winner = winner; }
    public int getMoveCount() { return moveCount; }

    public boolean makeMove(int row, int col, Player player) {
        if (state != GameState.IN_PROGRESS) return false;
        if (!currentTurn.equals(player)) return false;
        if (row < 0 || row >= 3 || col < 0 || col >= 3) return false;
        if (!board[row][col].isEmpty()) return false;

        board[row][col] = player.getSymbol().name();
        moveCount++;
        checkGameState(player);
        currentTurn = (currentTurn.equals(player1)) ? player2 : player1;
        return true;
    }

    private void checkGameState(Player player) {
        String sym = player.getSymbol().name();

        for (int i = 0; i < 3; i++) {
            if (board[i][0].equals(sym) && board[i][1].equals(sym) && board[i][2].equals(sym)) {
                state = GameState.WON; winner = player; return;
            }
            if (board[0][i].equals(sym) && board[1][i].equals(sym) && board[2][i].equals(sym)) {
                state = GameState.WON; winner = player; return;
            }
        }
        if (board[0][0].equals(sym) && board[1][1].equals(sym) && board[2][2].equals(sym)) {
            state = GameState.WON; winner = player; return;
        }
        if (board[0][2].equals(sym) && board[1][1].equals(sym) && board[2][0].equals(sym)) {
            state = GameState.WON; winner = player; return;
        }

        if (moveCount == 9) {
            state = GameState.DRAW;
        }
    }

    public void reset() {
        for (int i = 0; i < 3; i++) Arrays.fill(board[i], "");
        currentTurn = player1;
        state = GameState.IN_PROGRESS;
        winner = null;
        moveCount = 0;
    }
}
