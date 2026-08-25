package com.lld.minesweeper.strategy;

import com.lld.minesweeper.model.Cell;

import java.util.List;

/**
 * Deterministic mine placement for tests: puts mines at exactly the given coordinates,
 * ignoring {@code totalMines} and the excluded cell (a test that uses this is asserting the
 * flood-fill/win/loss mechanics against a known board, not the first-click-safe policy itself —
 * that policy is covered separately against {@link RandomMinePlacer}).
 */
public class FixedMinePlacer implements MinePlacer {
    private final List<int[]> coordinates;

    public FixedMinePlacer(List<int[]> coordinates) {
        this.coordinates = coordinates;
    }

    @Override
    public void place(Cell[][] board, int rows, int cols, int totalMines, int excludeRow, int excludeCol) {
        for (int[] coord : coordinates) {
            board[coord[0]][coord[1]].setMine(true);
        }
    }
}
