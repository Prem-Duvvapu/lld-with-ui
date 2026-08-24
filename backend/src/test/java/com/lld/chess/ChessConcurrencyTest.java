package com.lld.chess;

import com.lld.chess.exception.NoPieceAtSquareException;
import com.lld.chess.exception.NotYourTurnException;
import com.lld.chess.model.Game;
import com.lld.chess.repository.ChessRepository;
import com.lld.chess.service.ChessService;
import com.lld.chess.strategy.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Chess is turn-based and single-writer per game in the UI, but the HTTP layer gives no such
 * guarantee — two near-simultaneous requests for the same game are a real check-then-act race:
 * both could read the pre-move board before either writes, both then mutate it and both append
 * a move-history entry, corrupting the game (double move, turn flipping back to the mover).
 * {@link ChessService#makeMove} takes a per-game lock for exactly this reason; these tests
 * would fail without it.
 */
@DisplayName("Chess Concurrency — per-game move locking")
class ChessConcurrencyTest {

    private ChessRepository repository;
    private ChessService service;

    @BeforeEach
    void setUp() {
        repository = new ChessRepository();
        service = new ChessService(repository, new PieceMoveStrategyFactory(List.of(
                new PawnMoveStrategy(), new RookMoveStrategy(), new KnightMoveStrategy(),
                new BishopMoveStrategy(), new QueenMoveStrategy(), new KingMoveStrategy())));
    }

    @Test
    @DisplayName("Two threads racing to play the same first move: exactly one succeeds")
    void twoThreadsSameMove_onlyOneWins() throws InterruptedException {
        Game game = service.createGame("Alice", "Bob");
        long id = game.getId();

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);
        AtomicInteger wins = new AtomicInteger();
        AtomicInteger losses = new AtomicInteger();

        for (int i = 0; i < 2; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    service.makeMove(id, 6, 4, 4, 4, null); // e2-e4
                    wins.incrementAndGet();
                } catch (NoPieceAtSquareException | NotYourTurnException expected) {
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

        assertEquals(1, wins.get(), "exactly one thread may apply the move");
        assertEquals(1, losses.get());

        Game after = service.getGame(id);
        assertEquals(1, after.getMoveHistory().size(), "the move must be recorded exactly once");
        assertEquals(1, after.getCurrentPlayerIndex(), "turn must advance exactly once, to Black");
    }

    @Test
    @DisplayName("Twenty threads storming one game with the same move: nineteen lose")
    void twentyThreadsSameGame_nineteenLose() throws InterruptedException {
        Game game = service.createGame("Alice", "Bob");
        long id = game.getId();
        int threads = 20;

        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger wins = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    service.makeMove(id, 6, 4, 4, 4, null);
                    wins.incrementAndGet();
                } catch (NoPieceAtSquareException | NotYourTurnException expected) {
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

        assertEquals(1, wins.get(), "the move was applied more than once");
        assertEquals(1, service.getGame(id).getMoveHistory().size());
    }

    @Test
    @DisplayName("Disjoint games do not block each other — per-game locks, not one module-wide lock")
    void disjointGamesDoNotContend() throws InterruptedException {
        int pairs = 10;
        long[] ids = new long[pairs];
        for (int i = 0; i < pairs; i++) {
            ids[i] = service.createGame("W" + i, "B" + i).getId();
        }

        ExecutorService pool = Executors.newFixedThreadPool(pairs);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(pairs);
        AtomicInteger wins = new AtomicInteger();

        for (long id : ids) {
            pool.submit(() -> {
                try {
                    start.await();
                    service.makeMove(id, 6, 4, 4, 4, null);
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

    @Test
    @DisplayName("The race repeated 100 times: never two winners, not even once")
    void repeatedRaceNeverProducesTwoWinners() throws InterruptedException {
        int rounds = 100;
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            for (int round = 0; round < rounds; round++) {
                ChessRepository repo = new ChessRepository();
                ChessService localService = new ChessService(repo, new PieceMoveStrategyFactory(List.of(
                        new PawnMoveStrategy(), new RookMoveStrategy(), new KnightMoveStrategy(),
                        new BishopMoveStrategy(), new QueenMoveStrategy(), new KingMoveStrategy())));
                long id = localService.createGame("Alice", "Bob").getId();

                CountDownLatch start = new CountDownLatch(1);
                CountDownLatch done = new CountDownLatch(2);
                AtomicInteger wins = new AtomicInteger();

                for (int i = 0; i < 2; i++) {
                    pool.submit(() -> {
                        try {
                            start.await();
                            localService.makeMove(id, 6, 4, 4, 4, null);
                            wins.incrementAndGet();
                        } catch (NoPieceAtSquareException | NotYourTurnException expected) {
                            // lost the race
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                        } finally {
                            done.countDown();
                        }
                    });
                }

                start.countDown();
                assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + " did not finish");
                assertEquals(1, wins.get(), "round " + round + " applied the same move twice");
            }
        } finally {
            pool.shutdown();
            assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS), "pool did not shut down");
        }
    }
}
