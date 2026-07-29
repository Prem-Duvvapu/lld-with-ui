package com.lld.minesweeper.service;

import com.lld.minesweeper.model.Cell;
import com.lld.minesweeper.model.Game;
import com.lld.minesweeper.model.GameStatus;
import com.lld.minesweeper.repository.MinesweeperRepository;
import org.springframework.stereotype.Service;

import java.util.Random;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class MinesweeperService {
    private final MinesweeperRepository repository;
    private final ReentrantLock lock = new ReentrantLock();
    private final Random random = new Random();

    public MinesweeperService(MinesweeperRepository repository) {
        this.repository = repository;
    }

    public Game createGame(int rows, int cols, int mines) {
        lock.lock();
        try {
            long id = repository.nextId();
            Game game = new Game(id, rows, cols, mines);
            placeMines(game);
            calculateAdjacent(game);
            repository.save(game);
            return game;
        } finally {
            lock.unlock();
        }
    }

    private void placeMines(Game game) {
        Cell[][] board = game.getBoard();
        int rows = game.getRows();
        int cols = game.getCols();
        int placed = 0;
        while (placed < game.getTotalMines()) {
            int r = random.nextInt(rows);
            int c = random.nextInt(cols);
            if (!board[r][c].isMine()) {
                board[r][c].setMine(true);
                placed++;
            }
        }
    }

    private void calculateAdjacent(Game game) {
        Cell[][] board = game.getBoard();
        int rows = game.getRows();
        int cols = game.getCols();
        int[] dr = {-1, -1, -1, 0, 0, 1, 1, 1};
        int[] dc = {-1, 0, 1, -1, 1, -1, 0, 1};
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (board[r][c].isMine()) continue;
                int count = 0;
                for (int d = 0; d < 8; d++) {
                    int nr = r + dr[d];
                    int nc = c + dc[d];
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isMine())
                        count++;
                }
                board[r][c].setAdjacentMines(count);
            }
        }
    }

    public Game revealCell(long gameId, int row, int col) {
        lock.lock();
        try {
            Game game = repository.get(gameId);
            if (game == null) throw new IllegalArgumentException("Game not found");
            if (game.getStatus() != GameStatus.PLAYING) return game;

            Cell cell = game.getBoard()[row][col];
            if (cell.isRevealed() || cell.isFlagged()) return game;

            if (cell.isMine()) {
                cell.setRevealed(true);
                game.setStatus(GameStatus.LOST);
                return game;
            }

            revealRecursive(game, row, col);
            checkWin(game);
            return game;
        } finally {
            lock.unlock();
        }
    }

    private void revealRecursive(Game game, int row, int col) {
        Cell[][] board = game.getBoard();
        int rows = game.getRows();
        int cols = game.getCols();
        if (row < 0 || row >= rows || col < 0 || col >= cols) return;
        Cell cell = board[row][col];
        if (cell.isRevealed() || cell.isFlagged() || cell.isMine()) return;
        cell.setRevealed(true);
        game.setRevealedCount(game.getRevealedCount() + 1);
        if (cell.getAdjacentMines() == 0) {
            int[] dr = {-1, -1, -1, 0, 0, 1, 1, 1};
            int[] dc = {-1, 0, 1, -1, 1, -1, 0, 1};
            for (int d = 0; d < 8; d++) {
                revealRecursive(game, row + dr[d], col + dc[d]);
            }
        }
    }

    private void checkWin(Game game) {
        int totalCells = game.getRows() * game.getCols();
        if (game.getRevealedCount() + game.getTotalMines() == totalCells) {
            game.setStatus(GameStatus.WON);
        }
    }

    public Game flagCell(long gameId, int row, int col) {
        lock.lock();
        try {
            Game game = repository.get(gameId);
            if (game == null) throw new IllegalArgumentException("Game not found");
            if (game.getStatus() != GameStatus.PLAYING) return game;

            Cell cell = game.getBoard()[row][col];
            if (cell.isRevealed()) return game;

            cell.setFlagged(!cell.isFlagged());
            game.setFlagsUsed(cell.isFlagged() ? game.getFlagsUsed() + 1 : game.getFlagsUsed() - 1);
            return game;
        } finally {
            lock.unlock();
        }
    }

    public Game getGame(long id) {
        Game game = repository.get(id);
        if (game == null) throw new IllegalArgumentException("Game not found");

        if (game.getStatus() == GameStatus.PLAYING) {
            Cell[][] board = game.getBoard();
            for (int r = 0; r < game.getRows(); r++) {
                for (int c = 0; c < game.getCols(); c++) {
                    if (board[r][c].isMine()) {
                        board[r][c].setAdjacentMines(-1);
                    }
                }
            }
        }
        return game;
    }
}
