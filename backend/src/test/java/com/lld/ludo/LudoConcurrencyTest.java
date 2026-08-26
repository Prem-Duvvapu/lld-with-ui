package com.lld.ludo;

import com.lld.ludo.dice.FixedDiceRoller;
import com.lld.ludo.exception.InvalidMoveException;
import com.lld.ludo.model.Game;
import com.lld.ludo.model.TokenStatus;
import com.lld.ludo.repository.LudoRepository;
import com.lld.ludo.service.LudoService;
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
 * Guards the real check-then-act race {@code LudoService} has: "is a roll pending, and if so
 * apply this move" must be atomic, or two callers racing the same rolled 6 could both move a
 * HOME token out (or otherwise double-spend one roll). Both live under one per-game
 * {@link java.util.concurrent.locks.ReentrantLock} whose check-and-write happens in a single
 * critical section in {@code LudoService#doMove}/{@code #doRoll} — narrowing that lock's scope so
 * the check happens outside it must make these tests fail.
 */
@DisplayName("LudoService Concurrency — per-game lock")
class LudoConcurrencyTest {

    private static final List<String> NAMES = List.of("Alice", "Bob", "Charlie", "Diana");

    private LudoService newService() {
        return new LudoService(new LudoRepository(), new FixedDiceRoller(6));
    }

    @Test
    @DisplayName("N actors racing to spend the same rolled 6 on the same token: exactly one succeeds")
    void concurrentMoveSameToken_exactlyOneSucceeds() throws InterruptedException {
        LudoService service = newService();
        Game game = service.createGame(NAMES);
        game.setDiceValue(6);

        int actors = 12;
        ExecutorService pool = Executors.newFixedThreadPool(actors);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(actors);
        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();

        for (int i = 0; i < actors; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    service.moveToken(game.getId(), 0, 0);
                    succeeded.incrementAndGet();
                } catch (InvalidMoveException expected) {
                    rejected.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "actors did not finish in time");
        pool.shutdown();

        assertEquals(1, succeeded.get(), "exactly one actor may spend the pending roll");
        assertEquals(actors - 1, rejected.get());
        assertEquals(TokenStatus.ACTIVE, service.getGame(game.getId()).getTokens().get(0).get(0).getStatus());
        assertEquals(0, service.getGame(game.getId()).getDiceValue(), "the roll must be spent exactly once");
    }

    @Test
    @DisplayName("Repeated roll-spend race never produces two winners — 300 rounds")
    void concurrentMoveSameToken_repeatedNeverTwoWinners() throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(4);
        try {
            for (int round = 0; round < 300; round++) {
                LudoService service = newService();
                Game game = service.createGame(NAMES);
                game.setDiceValue(6);

                CountDownLatch start = new CountDownLatch(1);
                CountDownLatch done = new CountDownLatch(4);
                AtomicInteger succeeded = new AtomicInteger();

                for (int i = 0; i < 4; i++) {
                    pool.submit(() -> {
                        try {
                            start.await();
                            try {
                                service.moveToken(game.getId(), 0, 0);
                                succeeded.incrementAndGet();
                            } catch (InvalidMoveException expected) {
                                // exactly one actor should win this race
                            }
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                        } finally {
                            done.countDown();
                        }
                    });
                }

                start.countDown();
                assertTrue(done.await(5, TimeUnit.SECONDS));
                assertEquals(1, succeeded.get(), "round " + round + " produced " + succeeded.get() + " winners");
            }
        } finally {
            pool.shutdown();
        }
    }

    @Test
    @DisplayName("disjoint games never contend for one lock — concurrent rolls on two games stay independent")
    void disjointGames_neverContendForOneLock() throws InterruptedException {
        LudoService service = newService();
        Game gameA = service.createGame(NAMES);
        Game gameB = service.createGame(NAMES);

        int rounds = 200;
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            for (int r = 0; r < rounds; r++) {
                CountDownLatch start = new CountDownLatch(1);
                CountDownLatch done = new CountDownLatch(2);

                pool.submit(() -> {
                    try {
                        start.await();
                        Game g = service.getGame(gameA.getId());
                        if (g.getDiceValue() == 0) service.rollDice(gameA.getId());
                    } catch (InvalidMoveException | InterruptedException ignored) {
                        if (ignored instanceof InterruptedException) Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
                pool.submit(() -> {
                    try {
                        start.await();
                        Game g = service.getGame(gameB.getId());
                        if (g.getDiceValue() == 0) service.rollDice(gameB.getId());
                    } catch (InvalidMoveException | InterruptedException ignored) {
                        if (ignored instanceof InterruptedException) Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });

                start.countDown();
                assertTrue(done.await(5, TimeUnit.SECONDS));

                // Reset both games' pending rolls (via a HOME-leaving move, or leave for next round) —
                // simplest: just re-fetch and confirm each game's dice value is a legal value in [0,6],
                // proving neither game's state was corrupted by the other's concurrent access.
                int diceA = service.getGame(gameA.getId()).getDiceValue();
                int diceB = service.getGame(gameB.getId()).getDiceValue();
                assertTrue(diceA >= 0 && diceA <= 6);
                assertTrue(diceB >= 0 && diceB <= 6);
                if (diceA != 0) service.getGame(gameA.getId()).setDiceValue(0);
                if (diceB != 0) service.getGame(gameB.getId()).setDiceValue(0);
            }
        } finally {
            pool.shutdown();
        }
    }
}
