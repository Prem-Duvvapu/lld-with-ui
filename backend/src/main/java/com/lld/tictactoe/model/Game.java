package com.lld.tictactoe.model;

import java.util.ArrayList;
import java.util.List;

/**
 * Core game entity — manages the board, players, turns, win/draw logic.
 *
 * Fields  : board (Board), players (Player[]), currentPlayerIndex, status (GameStatus)
 * Methods : makeMove(row, col, player), checkWin(player), checkDraw(), switchPlayer(), getCurrentPlayer()
 */
public class Game {
    private final String id;
    private final Board board;
    private final Player[] players;
    private int currentPlayerIndex;
    private GameStatus status;
    private Player winner;
    private int moveCount;
    private int[] winningLine; // [startRow, startCol, endRow, endCol]
    private final List<Move> moveHistory;

    public Game(String id, String player1Name, String player2Name) {
        this.id = id;
        this.board = new Board(3);
        this.players = new Player[]{
            new Player(player1Name, Symbol.X),
            new Player(player2Name, Symbol.O)
        };
        this.currentPlayerIndex = 0;
        this.status = GameStatus.IN_PROGRESS;
        this.moveCount = 0;
        this.moveHistory = new ArrayList<>();
    }

    // ── Getters ──────────────────────────────────────────────────────────────

    public String getId() { return id; }
    public Board getBoardObj() { return board; }
    public String[][] getBoard() { return board.toMatrix(); }
    public Player[] getPlayers() { return players; }
    public Player getPlayer1() { return players[0]; }
    public Player getPlayer2() { return players[1]; }
    public int getCurrentPlayerIndex() { return currentPlayerIndex; }

    /** Returns the player whose turn it is. */
    public Player getCurrentPlayer() { return players[currentPlayerIndex]; }

    /** Alias used by the frontend JSON (currentTurn). */
    public Player getCurrentTurn() { return getCurrentPlayer(); }

    public GameStatus getStatus() { return status; }

    /** Alias for GameStatus as a GameState (for backward compatibility). */
    public GameState getState() {
        return switch (status) {
            case WON  -> GameState.WON;
            case DRAW -> GameState.DRAW;
            default   -> GameState.IN_PROGRESS;
        };
    }

    public Player getWinner() { return winner; }
    public int getMoveCount() { return moveCount; }
    public int[] getWinningLine() { return winningLine; }
    public List<Move> getMoveHistory() { return moveHistory; }

    // ── Core Game Methods ────────────────────────────────────────────────────

    /**
     * Attempts to place {@code player}'s symbol at (row, col).
     * Validates it is the correct player's turn and the cell is empty.
     *
     * @return true if the move was accepted; false otherwise.
     */
    public synchronized boolean makeMove(int row, int col, Player player) {
        if (status != GameStatus.IN_PROGRESS) return false;
        if (!getCurrentPlayer().equals(player)) return false;
        if (!board.isCellEmpty(row, col)) return false;

        board.setCell(row, col, player.getSymbol());
        moveCount++;
        moveHistory.add(new Move(moveCount, player.getName(), player.getSymbol(), row, col));

        if (checkWin(player)) {
            status = GameStatus.WON;
            winner = player;
        } else if (checkDraw()) {
            status = GameStatus.DRAW;
        } else {
            switchPlayer();
        }
        return true;
    }

    /**
     * Checks all rows, columns and diagonals for a win by {@code player}.
     * Sets {@code winningLine} if a winning line is found.
     */
    public boolean checkWin(Player player) {
        int[] line = board.checkWinLine(player.getSymbol());
        if (line != null) {
            this.winningLine = line;
            return true;
        }
        return false;
    }

    /** @return true when all cells are filled (and no winner yet). */
    public boolean checkDraw() {
        return board.isFull();
    }

    /** Advances the turn to the other player. */
    public void switchPlayer() {
        currentPlayerIndex = (currentPlayerIndex + 1) % 2;
    }

    /**
     * Undoes the last move. Only works while the game is IN_PROGRESS.
     *
     * @return true if a move was undone.
     */
    public synchronized boolean undoLastMove() {
        if (moveHistory.isEmpty() || status != GameStatus.IN_PROGRESS) return false;
        Move last = moveHistory.remove(moveHistory.size() - 1);
        board.clearCell(last.getRow(), last.getCol());
        moveCount--;
        winningLine = null;
        currentPlayerIndex = last.getSymbol() == players[0].getSymbol() ? 0 : 1;
        return true;
    }

    /** Resets the board and all counters for a new game. */
    public synchronized void reset() {
        board.reset();
        currentPlayerIndex = 0;
        status = GameStatus.IN_PROGRESS;
        winner = null;
        winningLine = null;
        moveCount = 0;
        moveHistory.clear();
    }
}
