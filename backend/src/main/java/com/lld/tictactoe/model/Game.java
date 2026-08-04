package com.lld.tictactoe.model;

import java.util.ArrayList;
import java.util.List;

public class Game {
    private String id;
    private Board board;
    private Player[] players;
    private int currentPlayerIndex;
    private GameStatus status;
    private GameState state; // Backward compatibility alias
    private GameMode gameMode;
    private AIDifficulty aiDifficulty;
    private Player winner;
    private int moveCount;
    private int[] winningLine; // [startRow, startCol, endRow, endCol]
    private List<Move> moveHistory;

    public Game(String id, String player1Name, String player2Name) {
        this(id, player1Name, player2Name, GameMode.HUMAN_VS_HUMAN, AIDifficulty.MEDIUM, 3);
    }

    public Game(String id, String player1Name, String player2Name, GameMode gameMode, AIDifficulty aiDifficulty) {
        this(id, player1Name, player2Name, gameMode, aiDifficulty, 3);
    }

    public Game(String id, String player1Name, String player2Name, GameMode gameMode, AIDifficulty aiDifficulty, int boardSize) {
        this.id = id;
        this.board = new Board(boardSize);
        this.players = new Player[]{
            new Player(player1Name, Symbol.X),
            new Player(player2Name, Symbol.O)
        };
        this.currentPlayerIndex = 0;
        this.status = GameStatus.IN_PROGRESS;
        this.state = GameState.IN_PROGRESS;
        this.gameMode = gameMode != null ? gameMode : GameMode.HUMAN_VS_HUMAN;
        this.aiDifficulty = aiDifficulty != null ? aiDifficulty : AIDifficulty.MEDIUM;
        this.moveCount = 0;
        this.winningLine = null;
        this.moveHistory = new ArrayList<>();
    }

    public String getId() { return id; }
    public Board getBoardObj() { return board; }
    public String[][] getBoard() { return board.toMatrix(); }
    public Player[] getPlayers() { return players; }
    public Player getPlayer1() { return players[0]; }
    public Player getPlayer2() { return players[1]; }
    public int getCurrentPlayerIndex() { return currentPlayerIndex; }
    public Player getCurrentPlayer() { return players[currentPlayerIndex]; }
    public Player getCurrentTurn() { return getCurrentPlayer(); }
    public GameStatus getStatus() { return status; }
    public GameState getState() { return state; }
    public GameMode getGameMode() { return gameMode; }
    public AIDifficulty getAiDifficulty() { return aiDifficulty; }
    public Player getWinner() { return winner; }
    public int getMoveCount() { return moveCount; }
    public int[] getWinningLine() { return winningLine; }
    public List<Move> getMoveHistory() { return moveHistory; }

    public synchronized boolean makeMove(int row, int col) {
        return makeMove(row, col, getCurrentPlayer());
    }

    public synchronized boolean makeMove(int row, int col, Player player) {
        if (status != GameStatus.IN_PROGRESS) return false;
        if (!getCurrentPlayer().equals(player)) return false;
        if (!board.isCellEmpty(row, col)) return false;

        board.setCell(row, col, player.getSymbol());
        moveCount++;
        moveHistory.add(new Move(moveCount, player.getName(), player.getSymbol(), row, col));

        if (checkWin(player)) {
            status = GameStatus.WON;
            state = GameState.WON;
            winner = player;
        } else if (checkDraw()) {
            status = GameStatus.DRAW;
            state = GameState.DRAW;
        } else {
            switchPlayer();
        }
        return true;
    }

    public boolean checkWin(Player player) {
        int[] winLine = board.checkWinLine(player.getSymbol());
        if (winLine != null) {
            this.winningLine = winLine;
            return true;
        }
        return false;
    }

    public boolean checkDraw() {
        return board.isFull();
    }

    public void switchPlayer() {
        currentPlayerIndex = (currentPlayerIndex + 1) % 2;
    }

    public synchronized boolean undoLastMove() {
        if (moveHistory.isEmpty() || status != GameStatus.IN_PROGRESS) return false;
        Move last = moveHistory.remove(moveHistory.size() - 1);
        board.clearCell(last.getRow(), last.getCol());
        moveCount--;
        winningLine = null;
        currentPlayerIndex = last.getSymbol() == players[0].getSymbol() ? 0 : 1;
        return true;
    }

    public synchronized void reset() {
        board.reset();
        currentPlayerIndex = 0;
        status = GameStatus.IN_PROGRESS;
        state = GameState.IN_PROGRESS;
        winner = null;
        winningLine = null;
        moveCount = 0;
        moveHistory.clear();
    }
}
