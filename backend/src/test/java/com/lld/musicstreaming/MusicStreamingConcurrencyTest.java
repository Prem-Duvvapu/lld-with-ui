package com.lld.musicstreaming;

import com.lld.musicstreaming.exception.ConcurrentStreamLimitExceededException;
import com.lld.musicstreaming.model.PlaybackSession;
import com.lld.musicstreaming.model.SubscriptionPlan;
import com.lld.musicstreaming.observer.ListeningHistoryListener;
import com.lld.musicstreaming.observer.PlayCountListener;
import com.lld.musicstreaming.repository.MusicStreamingRepository;
import com.lld.musicstreaming.service.MusicStreamingService;
import com.lld.musicstreaming.service.PlaybackService;
import com.lld.musicstreaming.service.RecommendationService;
import com.lld.musicstreaming.strategy.SubscriptionStrategyFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards the check-then-act race in {@code PlaybackService.startStream}: "count my
 * account's active sessions, then start a new one if under the plan's limit." Deleting
 * the per-user lock must make these fail. If they still pass without the lock they are
 * certifying the bug as fixed, which is worse than useless — see RestaurantConcurrencyTest
 * for the sibling test this one is modeled on.
 */
@DisplayName("Music Streaming Concurrency — Concurrent-Stream Limit Races")
class MusicStreamingConcurrencyTest {

    private MusicStreamingRepository repository;
    private PlaybackService playbackService;
    private SubscriptionStrategyFactory strategyFactory;
    private MusicStreamingService service;

    @BeforeEach
    void setUp() {
        repository = new MusicStreamingRepository();
        playbackService = new PlaybackService(List.of(new ListeningHistoryListener(), new PlayCountListener()));
        strategyFactory = new SubscriptionStrategyFactory();
        service = new MusicStreamingService(repository, playbackService, new RecommendationService(), strategyFactory);
    }

    @Test
    @DisplayName("Two devices racing on a FREE account (limit 1): exactly one wins")
    void twoDevicesRacingOnFreeAccount_onlyOneWins() throws InterruptedException {
        service.changeSubscription("U-1", SubscriptionPlan.FREE);

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);
        AtomicInteger wins = new AtomicInteger();
        AtomicInteger rejections = new AtomicInteger();

        for (int i = 0; i < 2; i++) {
            final String device = "device-" + i;
            pool.submit(() -> {
                try {
                    start.await();
                    playbackService.startStream(repository, strategyFactory, "U-1", "S-1", device);
                    wins.incrementAndGet();
                } catch (ConcurrentStreamLimitExceededException expected) {
                    rejections.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "threads did not finish in time");
        pool.shutdown();

        assertEquals(1, wins.get(), "exactly one device must win the stream slot");
        assertEquals(1, rejections.get(), "exactly one device must be rejected");
    }

    @Test
    @DisplayName("Twenty devices, one FREE account (limit 1): nineteen rejected")
    void twentyDevicesOneFreeAccount_nineteenRejected() throws InterruptedException {
        service.changeSubscription("U-1", SubscriptionPlan.FREE);
        int n = 20;
        runRace("U-1", n, 1);
    }

    @Test
    @DisplayName("Ten devices, one PREMIUM account (limit 2): exactly two win")
    void tenDevicesOnePremiumAccount_exactlyTwoWin() throws InterruptedException {
        service.changeSubscription("U-2", SubscriptionPlan.PREMIUM);
        runRace("U-2", 10, 2);
    }

    @Test
    @DisplayName("Fifteen devices, one FAMILY account (limit 6): exactly six win")
    void fifteenDevicesOneFamilyAccount_exactlySixWin() throws InterruptedException {
        service.changeSubscription("U-3", SubscriptionPlan.FAMILY);
        runRace("U-3", 15, 6);
    }

    /** Fires {@code n} concurrent startStream calls at one account and asserts exactly {@code limit} win. */
    private void runRace(String userId, int n, int limit) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(n);
        AtomicInteger wins = new AtomicInteger();
        AtomicInteger rejections = new AtomicInteger();

        for (int i = 0; i < n; i++) {
            final String device = "device-" + i;
            pool.submit(() -> {
                try {
                    start.await();
                    playbackService.startStream(repository, strategyFactory, userId, "S-1", device);
                    wins.incrementAndGet();
                } catch (ConcurrentStreamLimitExceededException expected) {
                    rejections.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "threads did not finish in time");
        pool.shutdown();

        assertEquals(limit, wins.get(), "exactly " + limit + " devices must win");
        assertEquals(n - limit, rejections.get(), "the rest must be rejected");
    }

    @Test
    @DisplayName("Disjoint accounts all succeed — locks are per-user, not global")
    void disjointAccountsAllSucceed() throws InterruptedException {
        String[] userIds = {"U-1", "U-2", "U-3"};
        // Give every account room for one more stream regardless of its seeded plan.
        for (String u : userIds) {
            service.changeSubscription(u, SubscriptionPlan.FAMILY);
        }

        int n = userIds.length;
        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(n);
        AtomicInteger wins = new AtomicInteger();

        for (String userId : userIds) {
            pool.submit(() -> {
                try {
                    start.await();
                    playbackService.startStream(repository, strategyFactory, userId, "S-1", "device-1");
                    wins.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "threads did not finish in time");
        pool.shutdown();

        assertEquals(n, wins.get(), "all 3 disjoint accounts must succeed in parallel");
    }

    @Test
    @DisplayName("Repeated race on a FREE account never produces two winners — 300 rounds")
    void repeatedRaceNeverProducesTwoWinners() throws InterruptedException {
        for (int round = 0; round < 300; round++) {
            MusicStreamingRepository freshRepo = new MusicStreamingRepository();
            PlaybackService freshPlayback = new PlaybackService(List.of(new ListeningHistoryListener(), new PlayCountListener()));

            ExecutorService pool = Executors.newFixedThreadPool(2);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(2);
            AtomicInteger wins = new AtomicInteger();

            for (int t = 0; t < 2; t++) {
                final String device = "device-" + t;
                pool.submit(() -> {
                    try {
                        start.await();
                        freshPlayback.startStream(freshRepo, strategyFactory, "U-1", "S-1", device);
                        wins.incrementAndGet();
                    } catch (ConcurrentStreamLimitExceededException expected) {
                        // normal
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
            }

            start.countDown();
            assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + " timed out");
            pool.shutdown();

            assertEquals(1, wins.get(), "round " + round + " produced " + wins.get() + " winners instead of 1");
        }
    }

    @Test
    @DisplayName("Concurrent stream starts for different songs all persist — no lost writes, no duplicate ids")
    void concurrentSessionsAllPersistWithUniqueIds() throws InterruptedException {
        service.changeSubscription("U-3", SubscriptionPlan.FAMILY); // limit 6
        String[] songs = {"S-1", "S-2", "S-3", "S-4", "S-5", "S-6"};

        ExecutorService pool = Executors.newFixedThreadPool(songs.length);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(songs.length);
        List<String> sessionIds = new CopyOnWriteArrayList<>();

        for (String songId : songs) {
            pool.submit(() -> {
                try {
                    start.await();
                    PlaybackSession session = playbackService.startStream(repository, strategyFactory, "U-3", songId, "device-" + songId);
                    sessionIds.add(session.getId());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "threads did not finish in time");
        pool.shutdown();

        assertEquals(songs.length, sessionIds.size(), "all sessions should persist");
        assertEquals(songs.length, Set.copyOf(sessionIds).size(), "no duplicate session ids");
    }

    // ------------------------------------------------------------------
    // simRace — the /sim/race engine the Simulation tab drives
    // ------------------------------------------------------------------

    @Test
    @DisplayName("simRace settles with exactly plan-limit winners, every round")
    void simRace_alwaysProducesExactlyLimitWinners() {
        service.simChangeSubscription("U-1", SubscriptionPlan.FREE);

        // The UI renders "won" and "rejected" straight from this payload, so a flaky
        // result would render a lie about what the lock guarantees.
        for (int round = 0; round < 25; round++) {
            Map<String, Object> result = service.simRace("U-1", "S-1", 5);

            assertEquals(5, result.get("attempts"), "round " + round);
            assertEquals(1, result.get("limit"), "round " + round);
            assertEquals(1L, result.get("won"), "round " + round + " must have exactly one winner");
            assertEquals(4L, result.get("rejected"), "round " + round + " must reject all but one");

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> rows = (List<Map<String, Object>>) result.get("results");
            long won = rows.stream().filter(r -> "WON".equals(r.get("outcome"))).count();
            assertEquals(1, won, "round " + round + " handed the account to " + won + " devices");
            assertEquals(5, rows.size(), "round " + round + " must report every attempt");
        }
    }

    @Test
    @DisplayName("simRace runs in the sandbox and never touches live sessions")
    void simRace_doesNotTouchLiveState() {
        assertTrue(repository.findActiveSessionsForUser("U-1").isEmpty());

        service.simRace("U-1", "S-1", 6);

        assertTrue(repository.findActiveSessionsForUser("U-1").isEmpty(),
                "the demo must not mutate the data the operational tabs show");
    }

    @Test
    @DisplayName("simRace clamps the device count into a sane range")
    void simRace_clampsDeviceCount() {
        assertEquals(2, service.simRace("U-1", "S-1", 1).get("attempts"), "below the floor clamps up to 2");
        assertEquals(20, service.simRace("U-1", "S-1", 500).get("attempts"), "above the ceiling clamps to 20");
    }
}
