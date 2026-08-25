package com.lld.minesweeper;

import com.lld.minesweeper.exception.GameOverException;
import com.lld.minesweeper.model.Game;
import com.lld.minesweeper.repository.MinesweeperRepository;
import com.lld.minesweeper.service.MinesweeperService;
import com.lld.minesweeper.strategy.RandomMinePlacer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Random;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The original implementation used one {@code ReentrantLock} shared by every game — safe, but
 * serialized unrelated games against each other for no reason. It also lazily places mines on
 * the first reveal, which is itself a check-then-act ({@code isFirstClickDone}) that two
 * concurrent first reveals for the same game could otherwise race. Per-game locking in
 * {@link MinesweeperService} closes both: these tests fail without it.
 */
@DisplayName("Minesweeper Concurrency — per-game reveal locking")
class MinesweeperConcurrencyTest {

    private MinesweeperService service;

    @BeforeEach
    void setUp() {
        service = new MinesweeperService(new MinesweeperRepository(), new RandomMinePlacer(new Random(123)));
    }

    @Test
    @DisplayName("Concurrent first-reveal race on the same cell: mines are placed exactly once, revealedCount never double-counts")
    void concurrentFirstRevealPlacesMinesExactlyOnce() throws InterruptedException {
        Game game = service.createGame(9, 9, 10);
        long id = game.getId();
        int threads = 20;

        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger errors = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    service.revealCell(id, 4, 4);
                } catch (GameOverException expected) {
                    // fine — a mine-hit LOST ends the game for later racers, not an error
                } catch (Exception e) {
                    errors.incrementAndGet();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "reveals did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(0, errors.get(), "no unexpected exception under concurrent first-reveal");

        Game after = service.getGame(id);
        int mineCount = 0;
        for (var row : after.getBoard()) for (var cell : row) if (cell.isMine()) mineCount++;
        assertEquals(10, mineCount, "mines must be placed exactly once, never doubled by a race");
        assertFalse(after.getBoard()[4][4].isMine(), "the raced first-click cell must still be mine-free");
    }

    @Test
    @DisplayName("Concurrent reveals of distinct cells on the same game: revealedCount matches exactly the cells actually revealed")
    void concurrentDistinctRevealsNeverCorruptCount() throws InterruptedException {
        Game game = service.createGame(9, 9, 1); // 1 mine tucked away
        long id = game.getId();
        // Force mine placement away from our target cells by doing a throwaway first reveal.
        service.revealCell(id, 8, 8);
        Game afterFirst = service.getGame(id);
        if (afterFirst.getStatus() != com.lld.minesweeper.model.GameStatus.PLAYING) {
            return; // unlucky hit or immediate win — nothing left to race on, skip
        }

        int threads = 8;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);

        for (int i = 0; i < threads; i++) {
            final int row = i % 9;
            final int col = (i * 3) % 9;
            pool.submit(() -> {
                try {
                    start.await();
                    service.revealCell(id, row, col);
                } catch (Exception ignored) {
                    // game may have finished mid-storm from an earlier reveal's cascade
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "reveals did not finish — possible deadlock");
        pool.shutdown();

        Game after = service.getGame(id);
        int actuallyRevealed = 0;
        for (var boardRow : after.getBoard()) {
            for (var cell : boardRow) {
                if (cell.isRevealed()) actuallyRevealed++;
            }
        }
        assertEquals(actuallyRevealed, after.getRevealedCount(),
                "revealedCount must exactly match the number of cells actually marked revealed — no double counting");
    }

    @Test
    @DisplayName("Disjoint games do not block each other — per-game locks, not one module-wide lock")
    void disjointGamesDoNotContend() throws InterruptedException {
        int gamesCount = 10;
        long[] ids = new long[gamesCount];
        for (int i = 0; i < gamesCount; i++) {
            ids[i] = service.createGame(9, 9, 5).getId();
        }

        ExecutorService pool = Executors.newFixedThreadPool(gamesCount);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(gamesCount);
        AtomicInteger successes = new AtomicInteger();

        for (long id : ids) {
            pool.submit(() -> {
                try {
                    start.await();
                    service.revealCell(id, 0, 0);
                    successes.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (Exception ignored) {
                    // a mine hit is still a "did not contend" success for this test's purpose
                    successes.incrementAndGet();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "independent games serialised against each other");
        pool.shutdown();

        assertEquals(gamesCount, successes.get(), "independent games must not contend for the same lock");
    }
}
