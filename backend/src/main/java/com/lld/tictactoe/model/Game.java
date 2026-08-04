package com.lld.tictactoe.model;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Game {
    private String id;
    private Player player1;
    private Player player2;
    private GameMode gameMode;
    private AIDifficulty aiDifficulty;
    private String[][] board;
    private Player currentTurn;
    private GameState state;
    private Player winner;
    private int moveCount;
    private int[] winningLine; // [startRow, startCol, endRow, endCol]
    private List<Move> moveHistory;

    public Game(String id, String player1Name, String player2Name) {
        this(id, player1Name, player2Name, GameMode.HUMAN_VS_HUMAN, AIDifficulty.MEDIUM);
    }

    public Game(String id, String player1Name, String player2Name, GameMode gameMode, AIDifficulty aiDifficulty) {
        this.id = id;
        this.player1 = new Player(player1Name, Player.Symbol.X);
        this.player2 = new Player(player2Name, Player.Symbol.O);
        this.gameMode = gameMode != null ? gameMode : GameMode.HUMAN_VS_HUMAN;
        this.aiDifficulty = aiDifficulty != null ? aiDifficulty : AIDifficulty.MEDIUM;
        this.board = new String[3][3];
        for (int i = 0; i < 3; i++) Arrays.fill(board[i], "");
        this.currentTurn = player1;
        this.state = GameState.IN_PROGRESS;
        this.moveCount = 0;
        this.winningLine = null;
        this.moveHistory = new ArrayList<>();
    }

    public String getId() { return id; }
    public Player getPlayer1() { return player1; }
    public Player getPlayer2() { return player2; }
    public GameMode getGameMode() { return gameMode; }
    public AIDifficulty getAiDifficulty() { return aiDifficulty; }
    public String[][] getBoard() { return board; }
    public Player getCurrentTurn() { return currentTurn; }
    public GameState getState() { return state; }
    public void setState(GameState state) { this.state = state; }
    public Player getWinner() { return winner; }
    public void setWinner(Player winner) { this.winner = winner; }
    public int getMoveCount() { return moveCount; }
    public int[] getWinningLine() { return winningLine; }
    public List<Move> getMoveHistory() { return moveHistory; }

    public synchronized boolean makeMove(int row, int col, Player player) {
        if (state != GameState.IN_PROGRESS) return false;
        if (!currentTurn.equals(player)) return false;
        if (row < 0 || row >= 3 || col < 0 || col >= 3) return false;
        if (!board[row][col].isEmpty()) return false;

        board[row][col] = player.getSymbol().name();
        moveCount++;
        moveHistory.add(new Move(moveCount, player.getName(), player.getSymbol(), row, col));

        checkGameState(player);
        if (state == GameState.IN_PROGRESS) {
            currentTurn = (currentTurn.equals(player1)) ? player2 : player1;
        }
        return true;
    }

    private void checkGameState(Player player) {
        String sym = player.getSymbol().name();

        // Check Rows
        for (int r = 0; r < 3; r++) {
            if (board[r][0].equals(sym) && board[r][1].equals(sym) && board[r][2].equals(sym)) {
                state = GameState.WON;
                winner = player;
                winningLine = new int[]{r, 0, r, 2};
                return;
            }
        }
        // Check Columns
        for (int c = 0; c < 3; c++) {
            if (board[0][c].equals(sym) && board[1][c].equals(sym) && board[2][c].equals(sym)) {
                state = GameState.WON;
                winner = player;
                winningLine = new int[]{0, c, 2, c};
                return;
            }
        }
        // Main Diagonal
        if (board[0][0].equals(sym) && board[1][1].equals(sym) && board[2][2].equals(sym)) {
            state = GameState.WON;
            winner = player;
            winningLine = new int[]{0, 0, 2, 2};
            return;
        }
        // Anti-Diagonal
        if (board[0][2].equals(sym) && board[1][1].equals(sym) && board[2][0].equals(sym)) {
            state = GameState.WON;
            winner = player;
            winningLine = new int[]{0, 2, 2, 0};
            return;
        }

        if (moveCount == 9) {
            state = GameState.DRAW;
        }
    }

    public synchronized boolean undoLastMove() {
        if (moveHistory.isEmpty() || state != GameState.IN_PROGRESS) return false;
        Move last = moveHistory.remove(moveHistory.size() - 1);
        board[last.getRow()][last.getCol()] = "";
        moveCount--;
        winningLine = null;
        currentTurn = last.getSymbol() == player1.getSymbol() ? player1 : player2;
        return true;
    }

    public synchronized void reset() {
        for (int i = 0; i < 3; i++) Arrays.fill(board[i], "");
        currentTurn = player1;
        state = GameState.IN_PROGRESS;
        winner = null;
        winningLine = null;
        moveCount = 0;
        moveHistory.clear();
    }
}
