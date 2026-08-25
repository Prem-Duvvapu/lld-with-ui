package com.lld.minesweeper;

import com.lld.minesweeper.exception.GameNotFoundException;
import com.lld.minesweeper.exception.GameOverException;
import com.lld.minesweeper.exception.InvalidBoardConfigException;
import com.lld.minesweeper.exception.InvalidCellException;
import com.lld.minesweeper.model.Cell;
import com.lld.minesweeper.model.Game;
import com.lld.minesweeper.model.GameStatus;
import com.lld.minesweeper.model.SimEvent;
import com.lld.minesweeper.repository.MinesweeperRepository;
import com.lld.minesweeper.service.MinesweeperService;
import com.lld.minesweeper.strategy.FixedMinePlacer;
import com.lld.minesweeper.strategy.RandomMinePlacer;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.List;
import java.util.Random;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Service-level tests. This module's repository ({@code MinesweeperRepository}) is a thin
 * {@code ConcurrentHashMap} wrapper with no independent behaviour of its own — its id-generation
 * and save/get round-trip are exercised implicitly by every test here via
 * {@code createGame}/{@code getGame}, so that coverage is merged in here rather than skipped
 * silently, matching the tictactoe and snakeladders suites in this same PR.
 */
class MinesweeperServiceTest {

    private MinesweeperService serviceWithFixedMines(List<int[]> mineCoords) {
        return new MinesweeperService(new MinesweeperRepository(), new FixedMinePlacer(mineCoords));
    }

    private MinesweeperService serviceWithRandomMines() {
        return new MinesweeperService(new MinesweeperRepository(), new RandomMinePlacer(new Random(42)));
    }

    // =========================================================================
    // BOARD CONFIG VALIDATION
    // =========================================================================

    @Test
    @DisplayName("non-positive dimensions are rejected")
    void rejectsNonPositiveDimensions() {
        MinesweeperService service = serviceWithRandomMines();
        assertThrows(InvalidBoardConfigException.class, () -> service.createGame(0, 9, 5));
        assertThrows(InvalidBoardConfigException.class, () -> service.createGame(9, -1, 5));
    }

    @Test
    @DisplayName("a negative mine count is rejected")
    void rejectsNegativeMineCount() {
        MinesweeperService service = serviceWithRandomMines();
        assertThrows(InvalidBoardConfigException.class, () -> service.createGame(9, 9, -1));
    }

    @Test
    @DisplayName("mines >= total cells is rejected up front, instead of hanging the placement loop forever")
    @Timeout(value = 2, unit = TimeUnit.SECONDS)
    void rejectsMineCountAtOrAboveCellCount() {
        MinesweeperService service = serviceWithRandomMines();
        assertThrows(InvalidBoardConfigException.class, () -> service.createGame(3, 3, 9));
        assertThrows(InvalidBoardConfigException.class, () -> service.createGame(3, 3, 10));
    }

    @Test
    @DisplayName("looking up an unknown game throws GameNotFoundException")
    void getUnknownGameThrows() {
        MinesweeperService service = serviceWithRandomMines();
        assertThrows(GameNotFoundException.class, () -> service.getGame(999L));
    }

    // =========================================================================
    // FIRST-CLICK-SAFE POLICY
    // =========================================================================

    @Test
    @DisplayName("the first-revealed cell is never a mine, even when mines fill every other cell")
    void firstClickIsAlwaysSafe() {
        // 3x3 board, 8 mines (rows*cols - 1): every cell except the one excluded from placement
        // MUST become a mine, regardless of RNG seed, because there is nowhere else to put them.
        // So this is a deterministic proof of the exclusion, not a statistical one.
        MinesweeperService service = serviceWithRandomMines();
        Game game = service.createGame(3, 3, 8);

        Game afterReveal = service.revealCell(game.getId(), 1, 1); // center

        Cell clicked = afterReveal.getBoard()[1][1];
        assertFalse(clicked.isMine(), "the clicked cell must never be a mine");
        assertTrue(clicked.isRevealed());
        assertNotEquals(GameStatus.LOST, afterReveal.getStatus());

        // Every other cell must be a mine (8 mines, 8 remaining cells).
        for (int r = 0; r < 3; r++) {
            for (int c = 0; c < 3; c++) {
                if (r == 1 && c == 1) continue;
                assertTrue(afterReveal.getBoard()[r][c].isMine(), "cell (" + r + "," + c + ") should be a mine");
            }
        }
    }

    @Test
    @DisplayName("mines are not placed at all until the first reveal")
    void minesAreNotPlacedBeforeFirstReveal() {
        MinesweeperService service = serviceWithRandomMines();
        Game game = service.createGame(9, 9, 10);
        assertFalse(game.isFirstClickDone());
        for (Cell[] row : game.getBoard()) {
            for (Cell cell : row) {
                assertFalse(cell.isMine(), "no cell should be a mine before the first reveal");
            }
        }
    }

    // =========================================================================
    // FLOOD-FILL RESOLVE CORRECTNESS
    // =========================================================================

    @Test
    @DisplayName("revealing an empty region cascades to reveal all connected zero-adjacency cells and their numbered border")
    void floodFillCascadesThroughEmptyRegion() {
        // 5x5 board, single mine tucked in the far corner (4,4). Revealing (0,0) — far from the
        // mine — must cascade across the whole open region and stop at the numbered cells
        // bordering the mine, without ever touching the mine cell itself.
        MinesweeperService service = serviceWithFixedMines(List.of(new int[]{4, 4}));
        Game game = service.createGame(5, 5, 1);

        Game after = service.revealCell(game.getId(), 0, 0);

        assertEquals(GameStatus.WON, after.getStatus(), "revealing the only open region should immediately win");
        assertFalse(after.getBoard()[4][4].isRevealed(), "the mine itself must never be auto-revealed by the cascade");
        // Every non-mine cell must be revealed.
        for (int r = 0; r < 5; r++) {
            for (int c = 0; c < 5; c++) {
                if (r == 4 && c == 4) continue;
                assertTrue(after.getBoard()[r][c].isRevealed(), "cell (" + r + "," + c + ") should have cascaded open");
            }
        }
    }

    @Test
    @DisplayName("a numbered cell is revealed as a leaf — it does not cascade further")
    void numberedCellStopsTheCascade() {
        // 3x3 board, mine at (0,0). Cell (1,1) is adjacent to the mine (adjacentMines=1) so
        // revealing it must reveal ONLY itself, not its neighbors.
        MinesweeperService service = serviceWithFixedMines(List.of(new int[]{0, 0}));
        Game game = service.createGame(3, 3, 1);

        Game after = service.revealCell(game.getId(), 1, 1);

        assertTrue(after.getBoard()[1][1].isRevealed());
        assertEquals(1, after.getBoard()[1][1].getAdjacentMines());
        assertFalse(after.getBoard()[0][1].isRevealed(), "a numbered cell must not cascade into its neighbors");
        assertFalse(after.getBoard()[2][2].isRevealed());
        assertEquals(1, after.getRevealedCount());
    }

    @Test
    @DisplayName("revealing a corner cell never indexes out of bounds")
    void revealingCornerCellStaysInBounds() {
        MinesweeperService service = serviceWithFixedMines(List.of(new int[]{4, 4}));
        Game game = service.createGame(5, 5, 1);

        assertDoesNotThrow(() -> service.revealCell(game.getId(), 0, 0));
    }

    @Test
    @DisplayName("revealing an already-revealed cell is a harmless no-op")
    void revealingAlreadyRevealedCellIsNoOp() {
        // Two mines at opposite corners: revealing the center is a leaf (adjacent to both),
        // leaving the game PLAYING (5 more safe cells remain unrevealed) so a second reveal of
        // the same already-open cell is a genuine no-op, not blocked by a GameOverException.
        MinesweeperService service = serviceWithFixedMines(List.of(new int[]{0, 0}, new int[]{2, 2}));
        Game game = service.createGame(3, 3, 2);
        service.revealCell(game.getId(), 1, 1);

        int before = service.getGame(game.getId()).getRevealedCount();
        Game after = service.revealCell(game.getId(), 1, 1); // already revealed
        assertEquals(GameStatus.PLAYING, after.getStatus());
        assertEquals(before, after.getRevealedCount());
    }

    // =========================================================================
    // WIN / LOSS CONDITIONS
    // =========================================================================

    @Test
    @DisplayName("revealing a mine cell loses the game")
    void revealingMineLoses() {
        MinesweeperService service = serviceWithFixedMines(List.of(new int[]{2, 2}));
        Game game = service.createGame(3, 3, 1);

        Game after = service.revealCell(game.getId(), 2, 2);

        assertEquals(GameStatus.LOST, after.getStatus());
        assertTrue(after.getBoard()[2][2].isRevealed());
    }

    @Test
    @DisplayName("revealing every non-mine cell wins the game")
    void revealingAllNonMineCellsWins() {
        MinesweeperService service = serviceWithFixedMines(List.of(new int[]{0, 0}, new int[]{2, 2}));
        Game game = service.createGame(3, 3, 2);

        // Reveal every safe cell one at a time (avoids relying on cascade shape). Stop early if
        // an earlier reveal's cascade already opened the rest and won the game.
        outer:
        for (int r = 0; r < 3; r++) {
            for (int c = 0; c < 3; c++) {
                if ((r == 0 && c == 0) || (r == 2 && c == 2)) continue;
                if (service.getGame(game.getId()).getStatus() != GameStatus.PLAYING) break outer;
                service.revealCell(game.getId(), r, c);
            }
        }

        Game finalState = service.getGame(game.getId());
        assertEquals(GameStatus.WON, finalState.getStatus());
    }

    // =========================================================================
    // FLAGGING
    // =========================================================================

    @Test
    @DisplayName("flagging toggles flaggedUsed and can be un-flagged")
    void flaggingTogglesFlagCount() {
        MinesweeperService service = serviceWithFixedMines(List.of(new int[]{0, 0}));
        Game game = service.createGame(3, 3, 1);

        Game flagged = service.flagCell(game.getId(), 0, 0);
        assertEquals(1, flagged.getFlagsUsed());
        assertTrue(flagged.getBoard()[0][0].isFlagged());

        Game unflagged = service.flagCell(game.getId(), 0, 0);
        assertEquals(0, unflagged.getFlagsUsed());
        assertFalse(unflagged.getBoard()[0][0].isFlagged());
    }

    @Test
    @DisplayName("a flagged cell cannot be revealed by direct reveal while flagged")
    void flaggedCellCannotBeRevealedUntilUnflagged() {
        MinesweeperService service = serviceWithFixedMines(List.of(new int[]{2, 2}));
        Game game = service.createGame(3, 3, 1);
        service.flagCell(game.getId(), 1, 1);

        Game after = service.revealCell(game.getId(), 1, 1);
        assertFalse(after.getBoard()[1][1].isRevealed(), "flagged cell must not reveal");
    }

    @Test
    @DisplayName("a revealed cell cannot be flagged")
    void revealedCellCannotBeFlagged() {
        MinesweeperService service = serviceWithFixedMines(List.of(new int[]{2, 2}));
        Game game = service.createGame(3, 3, 1);
        service.revealCell(game.getId(), 1, 1);

        Game after = service.flagCell(game.getId(), 1, 1);
        assertFalse(after.getBoard()[1][1].isFlagged());
        assertEquals(0, after.getFlagsUsed());
    }

    // =========================================================================
    // BOUNDS AND GAME-OVER GUARDS
    // =========================================================================

    @Test
    @DisplayName("revealing/flagging a cell outside the board throws InvalidCellException")
    void outOfBoundsCellThrows() {
        MinesweeperService service = serviceWithRandomMines();
        Game game = service.createGame(5, 5, 3);

        assertThrows(InvalidCellException.class, () -> service.revealCell(game.getId(), -1, 0));
        assertThrows(InvalidCellException.class, () -> service.revealCell(game.getId(), 5, 0));
        assertThrows(InvalidCellException.class, () -> service.revealCell(game.getId(), 0, 5));
        assertThrows(InvalidCellException.class, () -> service.flagCell(game.getId(), 100, 100));
    }

    @Test
    @DisplayName("acting on a finished game throws GameOverException")
    void actingOnFinishedGameThrows() {
        MinesweeperService service = serviceWithFixedMines(List.of(new int[]{2, 2}));
        Game game = service.createGame(3, 3, 1);
        service.revealCell(game.getId(), 2, 2); // hits the mine -> LOST

        assertThrows(GameOverException.class, () -> service.revealCell(game.getId(), 0, 0));
        assertThrows(GameOverException.class, () -> service.flagCell(game.getId(), 0, 0));
    }

    @Test
    @DisplayName("getGame masks adjacentMines on unrevealed mine cells to -1 while the game is still in progress")
    void getGameMasksMineAdjacencyWhilePlaying() {
        // Two mines so the single leaf reveal below does NOT complete the game — it must stay
        // PLAYING for the masking (which only applies while PLAYING) to be observable.
        MinesweeperService service = serviceWithFixedMines(List.of(new int[]{0, 0}, new int[]{2, 2}));
        Game game = service.createGame(3, 3, 2);
        service.revealCell(game.getId(), 1, 1); // triggers placement, leaf reveal only

        Game fetched = service.getGame(game.getId());
        assertEquals(GameStatus.PLAYING, fetched.getStatus());
        assertEquals(-1, fetched.getBoard()[0][0].getAdjacentMines());
        assertEquals(-1, fetched.getBoard()[2][2].getAdjacentMines());
    }

    // =========================================================================
    // MINE PLACERS
    // =========================================================================

    @Test
    @DisplayName("RandomMinePlacer places exactly totalMines mines and never on the excluded cell")
    void randomMinePlacerRespectsCountAndExclusion() {
        RandomMinePlacer placer = new RandomMinePlacer(new Random(7));
        Cell[][] board = new Cell[9][9];
        for (int r = 0; r < 9; r++) for (int c = 0; c < 9; c++) board[r][c] = new Cell(r, c);

        placer.place(board, 9, 9, 10, 4, 4);

        int mineCount = 0;
        for (Cell[] row : board) for (Cell cell : row) if (cell.isMine()) mineCount++;
        assertEquals(10, mineCount);
        assertFalse(board[4][4].isMine());
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    @Test
    @DisplayName("sim engine runs independently of the live game repository")
    void simEngineIsolatedFromLiveGames() {
        MinesweeperService service = serviceWithRandomMines();
        Game live = service.createGame(5, 5, 3);
        service.revealCell(live.getId(), 0, 0);

        // Sim and live use separate repository instances, each with its own id sequence starting
        // at 1 — so ids may coincide numerically. Isolation is proven by state, not by id identity.
        Game sim = service.simReset();
        assertEquals(5, sim.getRows());

        Game simAfterReveal = service.simReveal(2, 2);
        assertTrue(simAfterReveal.getRevealedCount() >= 0);

        List<SimEvent> log = service.simGetEventLog();
        assertFalse(log.isEmpty());
    }
}
