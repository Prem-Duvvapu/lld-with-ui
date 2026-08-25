package com.lld.minesweeper.strategy;

import com.lld.minesweeper.model.Cell;
import org.springframework.stereotype.Component;

import java.util.Random;

/**
 * Production mine placement: uniformly random among every cell except the excluded (first-click)
 * one. Termination is guaranteed by the service's board-config validation, which requires
 * {@code totalMines < rows * cols} — so at least one free, non-excluded cell always remains while
 * {@code placed < totalMines}.
 */
@Component
public class RandomMinePlacer implements MinePlacer {
    private final Random random;

    public RandomMinePlacer() {
        this(new Random());
    }

    public RandomMinePlacer(Random random) {
        this.random = random;
    }

    @Override
    public void place(Cell[][] board, int rows, int cols, int totalMines, int excludeRow, int excludeCol) {
        int placed = 0;
        while (placed < totalMines) {
            int r = random.nextInt(rows);
            int c = random.nextInt(cols);
            if (r == excludeRow && c == excludeCol) continue;
            if (!board[r][c].isMine()) {
                board[r][c].setMine(true);
                placed++;
            }
        }
    }
}
