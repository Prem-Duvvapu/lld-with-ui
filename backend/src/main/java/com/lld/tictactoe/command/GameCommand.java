package com.lld.tictactoe.command;

import com.lld.tictactoe.model.Game;

/** Encapsulates one mutation of a Tic Tac Toe game. */
public interface GameCommand {
    Game execute();
}
