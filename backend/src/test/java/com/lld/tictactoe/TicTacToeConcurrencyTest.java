package com.lld.tictactoe;

import com.lld.tictactoe.exception.CellOccupiedException;
import com.lld.tictactoe.exception.NotYourTurnException;
import com.lld.tictactoe.model.Game;
import com.lld.tictactoe.repository.GameRepository;
import com.lld.tictactoe.service.TicTacToeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The HTTP layer gives no guarantee that only one request for a given game is in flight at a
 * time. Two near-simultaneous move requests for the same cell are a check-then-act race: both
 * could observe the pre-move board as empty before either writes. {@link TicTacToeService}
 * guards {@code makeMove} with a per-game lock for exactly this reason — these tests fail
 * without it.
 */
@DisplayName("Tic-Tac-Toe Concurrency — per-game move locking")
class TicTacToeConcurrencyTest {

    private TicTacToeService service;

    @BeforeEach
    void setUp() {
        service = new TicTacToeService(new GameRepository());
    }

    @Test
    @DisplayName("Two threads racing to play the same cell: exactly one succeeds")
    void twoThreadsSameCell_onlyOneWins() throws InterruptedException {
        Game game = service.createGame("Alice", "Bob");
        String id = game.getId();

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);
        AtomicInteger wins = new AtomicInteger();
        AtomicInteger losses = new AtomicInteger();

        // Both threads act as Alice (the only legal mover on move 1) targeting the same cell.
        for (int i = 0; i < 2; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    service.makeMove(id, 0, 0, "Alice");
                    wins.incrementAndGet();
                } catch (CellOccupiedException | NotYourTurnException expected) {
                    losses.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "moves did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(1, wins.get(), "exactly one thread may claim the cell");
        assertEquals(1, losses.get());

        Game after = service.getGame(id);
        assertEquals(1, after.getMoveCount(), "the move must be recorded exactly once");
    }

    @Test
    @DisplayName("Twenty threads storming one cell: nineteen lose, board never corrupts")
    void twentyThreadsSameCell_nineteenLose() throws InterruptedException {
        Game game = service.createGame("Alice", "Bob");
        String id = game.getId();
        int threads = 20;

        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger wins = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    service.makeMove(id, 0, 0, "Alice");
                    wins.incrementAndGet();
                } catch (CellOccupiedException | NotYourTurnException expected) {
                    // lost the race
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "moves did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(1, wins.get(), "the cell was claimed more than once");
        assertEquals(1, service.getGame(id).getMoveCount());
    }

    @Test
    @DisplayName("Disjoint games do not block each other — per-game locks, not one module-wide lock")
    void disjointGamesDoNotContend() throws InterruptedException {
        int pairs = 10;
        String[] ids = new String[pairs];
        for (int i = 0; i < pairs; i++) {
            ids[i] = service.createGame("Alice" + i, "Bob" + i).getId();
        }

        ExecutorService pool = Executors.newFixedThreadPool(pairs);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(pairs);
        AtomicInteger wins = new AtomicInteger();

        for (int i = 0; i < pairs; i++) {
            String id = ids[i];
            String player = "Alice" + i;
            pool.submit(() -> {
                try {
                    start.await();
                    service.makeMove(id, 0, 0, player);
                    wins.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "independent games serialised against each other");
        pool.shutdown();

        assertEquals(pairs, wins.get(), "independent games must not contend for the same lock");
    }
}
