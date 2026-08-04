package com.lld.tictactoe.strategy;

import com.lld.tictactoe.model.Game;

public interface AIMoveStrategy {
    int[] findBestMove(Game game);
}
