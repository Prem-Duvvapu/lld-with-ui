package com.lld.tictactoe.command;

import com.lld.tictactoe.exception.CellOccupiedException;
import com.lld.tictactoe.exception.GameOverException;
import com.lld.tictactoe.exception.InvalidMoveException;
import com.lld.tictactoe.exception.NotYourTurnException;
import com.lld.tictactoe.model.Game;
import com.lld.tictactoe.model.GameStatus;
import com.lld.tictactoe.model.Move;
import com.lld.tictactoe.model.Player;

import java.util.List;

/** Places one validated move and retains enough identity to undo that exact move later. */
public final class PlaceMoveCommand implements GameCommand {

    private final Game game;
    private final int row;
    private final int col;
    private final String playerName;
    private boolean executed;
    private int executedMoveNumber;

    public PlaceMoveCommand(Game game, int row, int col, String playerName) {
        this.game = game;
        this.row = row;
        this.col = col;
        this.playerName = playerName;
    }

    @Override
    public Game execute() {
        if (executed) {
            throw new InvalidMoveException("Move command has already been executed");
        }
        if (row < 0 || row >= game.getBoardObj().getSize()
                || col < 0 || col >= game.getBoardObj().getSize()) {
            throw new InvalidMoveException("Cell (" + row + ", " + col + ") is outside the board");
        }
        if (game.getStatus() != GameStatus.IN_PROGRESS) {
            throw new GameOverException("Game is over: " + game.getStatus());
        }

        Player currentPlayer = game.getCurrentTurn();
        if (!currentPlayer.getName().equals(playerName)) {
            throw new NotYourTurnException("Not your turn. Current turn: " + currentPlayer.getName());
        }
        if (!game.getBoardObj().isCellEmpty(row, col)) {
            throw new CellOccupiedException("Cell (" + row + ", " + col + ") is already occupied");
        }
        if (!game.makeMove(row, col, currentPlayer)) {
            throw new InvalidMoveException("Invalid move at (" + row + ", " + col + ")");
        }

        executed = true;
        executedMoveNumber = game.getMoveCount();
        return game;
    }

    /**
     * Reverses this command only while it is still the game's most recent move.
     * A completed game remains immutable, preserving the pre-existing undo contract.
     */
    public Game undo() {
        if (!executed || game.getStatus() != GameStatus.IN_PROGRESS) {
            return game;
        }

        List<Move> history = game.getMoveHistory();
        if (history.isEmpty() || history.get(history.size() - 1).getMoveNumber() != executedMoveNumber) {
            throw new IllegalStateException("Move commands must be undone in reverse execution order");
        }
        if (game.undoLastMove()) {
            executed = false;
        }
        return game;
    }

    public boolean isExecuted() {
        return executed;
    }
}
