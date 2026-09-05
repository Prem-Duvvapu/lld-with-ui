package com.lld.notification;

import com.lld.notification.channel.NotificationChannel;
import com.lld.notification.channel.NotificationChannelFactory;
import com.lld.notification.model.ChannelType;
import com.lld.notification.model.Notification;
import com.lld.notification.model.NotificationType;
import com.lld.notification.repository.NotificationRepository;
import com.lld.notification.retry.ExponentialBackoffRetryPolicy;
import com.lld.notification.service.NotificationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.EnumMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Guards the check-then-act race {@code NotificationService#send} exists to close: "has this
 * idempotency key been seen?" (check) then "record it and enqueue" (act), with a per-key
 * {@link java.util.concurrent.locks.ReentrantLock} in between. Deleting that lock (or the
 * {@code idempotencyIndex.get(key)} check inside it) must make this fail — a single-shot version
 * of this test would pass on broken code most of the time, since the unguarded window is
 * nanoseconds wide (see RCA-052 in this repo's RCA.md for the exact shape of that failure mode),
 * so every round below uses a brand-new service instance and the invariant is checked every
 * round, 200 times.
 */
@DisplayName("Notification Idempotency Concurrency")
class NotificationIdempotencyConcurrencyTest {

    private static final int ROUNDS = 200;
    private static final int THREADS = 12;

    private NotificationChannelFactory countingFactory(AtomicInteger sendCounter) {
        Map<ChannelType, NotificationChannel> channels = new EnumMap<>(ChannelType.class);
        NotificationChannel counting = new NotificationChannel() {
            @Override
            public void send(Notification notification) {
                sendCounter.incrementAndGet();
            }

            @Override
            public ChannelType getType() {
                return ChannelType.EMAIL;
            }
        };
        channels.put(ChannelType.EMAIL, counting);
        return new NotificationChannelFactory(channels);
    }

    @Test
    @DisplayName("Repeated rounds: N threads racing send() with the identical idempotency key always yield exactly one dispatched notification")
    void repeatedConcurrentSendWithSameKeyNeverDoubleDispatches() throws InterruptedException {
        for (int round = 0; round < ROUNDS; round++) {
            NotificationRepository repository = new NotificationRepository();
            repository.registerRecipient(1L, "Alice");
            AtomicInteger channelInvocations = new AtomicInteger();
            // workerCount=0, start() never called: send() only enqueues. We drain by hand after
            // the race so exactly-one-dispatch is provable without racing background threads too.
            NotificationService service = new NotificationService(
                    repository, countingFactory(channelInvocations),
                    new ExponentialBackoffRetryPolicy(3, Duration.ofMillis(1)), 0);

            String sameKey = "RACE-KEY-" + round;
            ExecutorService pool = Executors.newFixedThreadPool(THREADS);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(THREADS);
            Set<Long> resultIds = ConcurrentHashMap.newKeySet();

            for (int i = 0; i < THREADS; i++) {
                pool.submit(() -> {
                    try {
                        start.await();
                        Notification n = service.send(1L, NotificationType.TRANSACTIONAL, ChannelType.EMAIL,
                                Map.of(), sameKey, null);
                        resultIds.add(n.getId());
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
            }

            start.countDown();
            assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + ": threads did not finish — possible deadlock");
            pool.shutdown();

            assertEquals(1, resultIds.size(), "round " + round + ": all " + THREADS + " threads must resolve to the same notification id");
            assertEquals(1, service.pendingQueueSize(), "round " + round + ": exactly one notification may ever be enqueued for this key");

            // Drain the single queued notification by hand and confirm the channel is reached
            // exactly once — proving the "duplicates never dispatch" half of the guarantee, not
            // just the "duplicates share an id" half.
            service.drainOnce();
            assertEquals(1, channelInvocations.get(), "round " + round + ": exactly one send() must ever reach the channel");
            assertEquals(0, service.pendingQueueSize(), "round " + round + ": nothing left to drain");
        }
    }
}
