package com.lld.tictactoe.command;

import com.lld.tictactoe.model.Game;

/** Executes the inverse operation retained by the latest {@link PlaceMoveCommand}. */
public final class UndoMoveCommand implements GameCommand {

    private final PlaceMoveCommand target;
    private boolean undone;

    public UndoMoveCommand(PlaceMoveCommand target) {
        this.target = target;
    }

    @Override
    public Game execute() {
        boolean wasExecuted = target.isExecuted();
        Game game = target.undo();
        undone = wasExecuted && !target.isExecuted();
        return game;
    }

    public boolean wasUndone() {
        return undone;
    }
}
