package com.lld.tictactoe.strategy;

import com.lld.tictactoe.model.Game;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class RandomAIMoveStrategy implements AIMoveStrategy {
    private final Random random = new Random();

    @Override
    public int[] findBestMove(Game game) {
        String[][] board = game.getBoard();
        List<int[]> emptyCells = new ArrayList<>();

        for (int r = 0; r < 3; r++) {
            for (int c = 0; c < 3; c++) {
                if (board[r][c].isEmpty()) {
                    emptyCells.add(new int[]{r, c});
                }
            }
        }

        if (emptyCells.isEmpty()) return null;
        return emptyCells.get(random.nextInt(emptyCells.size()));
    }
}
