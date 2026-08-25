package com.lld.minesweeper.strategy;

import com.lld.minesweeper.model.Cell;

/**
 * Strategy for choosing which cells hold mines. Injected into {@code MinesweeperService} so
 * production games place mines genuinely at random ({@link RandomMinePlacer}) while tests can
 * pin the exact mine layout with {@link FixedMinePlacer} — the flood-fill, win and loss logic is
 * otherwise impossible to test deterministically since the original implementation placed mines
 * with a bare, unseeded {@code java.util.Random} directly inside the service.
 */
public interface MinePlacer {
    /**
     * Places exactly {@code totalMines} mines on {@code board}, never on
     * ({@code excludeRow}, {@code excludeCol}) — the first-click-safe cell.
     */
    void place(Cell[][] board, int rows, int cols, int totalMines, int excludeRow, int excludeCol);
}
