package com.lld.tictactoe.command;

import com.lld.tictactoe.model.Game;

/** Clears a game back to its initial board and turn. */
public final class ResetGameCommand implements GameCommand {

    private final Game game;

    public ResetGameCommand(Game game) {
        this.game = game;
    }

    @Override
    public Game execute() {
        game.reset();
        return game;
    }
}
