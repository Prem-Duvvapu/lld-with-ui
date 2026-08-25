package com.lld.socialnetwork;

import com.lld.socialnetwork.exception.AlreadyFriendsException;
import com.lld.socialnetwork.exception.DuplicateFriendRequestException;
import com.lld.socialnetwork.exception.RequestAlreadyRespondedException;
import com.lld.socialnetwork.model.FriendRequest;
import com.lld.socialnetwork.model.User;
import com.lld.socialnetwork.observer.FeedNotifier;
import com.lld.socialnetwork.observer.InAppFeedObserver;
import com.lld.socialnetwork.observer.LoggingFeedObserver;
import com.lld.socialnetwork.repository.SocialRepository;
import com.lld.socialnetwork.service.SocialService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards the check-then-act race in {@link SocialService}'s canonical pair lock: two users
 * racing to become friends (from either direction, or via a concurrent send + duplicate-send,
 * or a concurrent double-accept) must never end up with two PENDING requests, a lost accept, or
 * a deadlock. Same per-pair-lock shape as {@code linkedin.service.LinkedInService}, proven
 * deterministically with {@link CountDownLatch} rather than sleeps, mirroring
 * {@code InventoryConcurrencyTest}.
 */
@DisplayName("SocialNetwork Concurrency — canonical pair lock")
class SocialConcurrencyTest {

    private SocialService newService() {
        SocialRepository repo = new SocialRepository();
        InAppFeedObserver inApp = new InAppFeedObserver();
        FeedNotifier notifier = new FeedNotifier(List.of(inApp, new LoggingFeedObserver()));
        return new SocialService(repo, notifier, inApp);
    }

    private long idOf(SocialService service, String namePart) {
        return service.getAllUsers().stream()
                .filter(u -> u.getName().contains(namePart))
                .findFirst().orElseThrow().getId();
    }

    @Test
    @DisplayName("N threads racing to send a friend request between the same pair: exactly one creates a PENDING request")
    void concurrentSendFriendRequest_onlyOneCreatesAPendingRequest() throws InterruptedException {
        SocialService service = newService();
        long carol = idOf(service, "Carol");
        long bob = idOf(service, "Bob"); // Carol/Bob are NOT already friends in seed data

        int threads = 12;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger wins = new AtomicInteger();
        AtomicInteger rejections = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            boolean fromCarol = i % 2 == 0; // alternate direction — same pair, same lock key either way
            pool.submit(() -> {
                try {
                    start.await();
                    if (fromCarol) {
                        service.sendFriendRequest(carol, bob);
                    } else {
                        service.sendFriendRequest(bob, carol);
                    }
                    wins.incrementAndGet();
                } catch (DuplicateFriendRequestException | AlreadyFriendsException expected) {
                    rejections.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "racers did not finish in time — possible deadlock");
        pool.shutdown();

        assertEquals(1, wins.get(), "exactly one send must create the PENDING request");
        assertEquals(threads - 1, rejections.get());
        assertEquals(1, service.getPendingRequests(bob).size() + service.getPendingRequests(carol).size(),
                "no duplicate FriendRequest rows may exist for this pair");
    }

    @Test
    @DisplayName("N threads racing to accept/reject the same request: exactly one response wins, no lost accept")
    void concurrentRespond_onlyOneResponseWins() throws InterruptedException {
        SocialService service = newService();
        long carol = idOf(service, "Carol");
        long alice = idOf(service, "Alice");
        FriendRequest req = service.sendFriendRequest(carol, alice);

        int threads = 10;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger wins = new AtomicInteger();
        AtomicInteger conflicts = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            boolean accept = i % 2 == 0; // half try to accept, half try to reject — only one of ANY of them may win
            pool.submit(() -> {
                try {
                    start.await();
                    service.respondToRequest(req.getId(), accept);
                    wins.incrementAndGet();
                } catch (RequestAlreadyRespondedException expected) {
                    conflicts.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "responders did not finish in time — possible deadlock");
        pool.shutdown();

        assertEquals(1, wins.get(), "exactly one accept/reject may win — the accept must never be lost, nor double-applied");
        assertEquals(threads - 1, conflicts.get());

        boolean stillPending = service.getPendingRequests(alice).stream().anyMatch(r -> r.getId() == req.getId());
        assertFalse(stillPending, "the request must no longer be PENDING after the race resolves it");

        // Friendship state must be symmetric and consistent regardless of which side won the race.
        assertEquals(service.getFriendIds(alice).contains(carol), service.getFriendIds(carol).contains(alice));
    }

    @Test
    @DisplayName("disjoint pairs never contend — unrelated friend requests all succeed in parallel")
    void disjointPairsDoNotContend() throws InterruptedException {
        SocialService service = newService();
        long bob = idOf(service, "Bob");
        long carol = idOf(service, "Carol");
        User dave = service.createUser("Dave", "dave@x.com", "");
        User eve = service.createUser("Eve", "eve@x.com", "");

        // Two disjoint pairs, each on its own lock: (Carol, Dave) and (Eve, Bob).
        int threads = 2;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger wins = new AtomicInteger();

        pool.submit(() -> {
            try {
                start.await();
                service.sendFriendRequest(carol, dave.getId());
                wins.incrementAndGet();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                done.countDown();
            }
        });
        pool.submit(() -> {
            try {
                start.await();
                service.sendFriendRequest(eve.getId(), bob);
                wins.incrementAndGet();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                done.countDown();
            }
        });

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS));
        pool.shutdown();

        assertEquals(2, wins.get(), "unrelated pairs must not block each other");
    }

    @Test
    @DisplayName("repeated pair-lock race never produces two winners — 200 rounds")
    void repeatedRaceNeverProducesTwoWinners() throws InterruptedException {
        for (int round = 0; round < 200; round++) {
            SocialService service = newService();
            long carol = idOf(service, "Carol");
            long bob = idOf(service, "Bob");

            ExecutorService pool = Executors.newFixedThreadPool(2);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(2);
            AtomicInteger wins = new AtomicInteger();

            pool.submit(() -> {
                try {
                    start.await();
                    service.sendFriendRequest(carol, bob);
                    wins.incrementAndGet();
                } catch (DuplicateFriendRequestException expected) {
                    // the loser — exactly right
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
            pool.submit(() -> {
                try {
                    start.await();
                    service.sendFriendRequest(bob, carol);
                    wins.incrementAndGet();
                } catch (DuplicateFriendRequestException expected) {
                    // the loser — exactly right
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });

            start.countDown();
            assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + " timed out — possible deadlock");
            pool.shutdown();

            assertEquals(1, wins.get(), "round " + round + " produced " + wins.get() + " winners instead of 1");
        }
    }
}
