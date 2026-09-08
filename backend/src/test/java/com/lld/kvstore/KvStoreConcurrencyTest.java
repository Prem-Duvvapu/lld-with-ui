package com.lld.kvstore;

import com.lld.kvstore.exception.VersionConflictException;
import com.lld.kvstore.model.KvEntry;
import com.lld.kvstore.repository.KvStoreRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Proves {@code KvStoreRepository#cas} is a genuine compare-and-swap, not a {@code get()}
 * followed by an unconditional {@code set()} — and that it closes the race entirely
 * lock-free, via {@code ConcurrentHashMap#compute}, unlike every other module in this repo
 * (which all use a per-entity {@code ReentrantLock}).
 */
public class KvStoreConcurrencyTest {

    @Test
    @DisplayName("N threads CAS-ing the same key with the same expected version: exactly one wins per round — 300 rounds")
    void repeatedCasRaceProducesExactlyOneWinnerPerVersionBump() throws InterruptedException {
        int racerCount = 10;

        for (int round = 0; round < 300; round++) {
            KvStoreRepository repository = new KvStoreRepository();
            KvEntry seed = repository.set("contended-key", "seed", null);

            ExecutorService pool = Executors.newFixedThreadPool(racerCount);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(racerCount);
            AtomicInteger won = new AtomicInteger();
            AtomicInteger lost = new AtomicInteger();

            for (int i = 0; i < racerCount; i++) {
                final int racer = i;
                pool.submit(() -> {
                    try {
                        start.await();
                        repository.cas("contended-key", seed.getVersion(), "racer-" + racer);
                        won.incrementAndGet();
                    } catch (VersionConflictException expected) {
                        lost.incrementAndGet();
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

            assertEquals(1, won.get(), "round " + round + ": exactly one racer must win the CAS -- a broken get()-then-set() would let several through");
            assertEquals(racerCount - 1, lost.get(), "round " + round + ": every other racer must cleanly lose, not silently overwrite");
            assertEquals(seed.getVersion() + 1, repository.get("contended-key").getVersion(),
                    "round " + round + ": exactly one version bump must have happened, never more, never fewer");
        }
    }

    @Test
    @DisplayName("N couriers CAS-ing in sequence-dependent waves never lose an update — 200 rounds")
    void sequentialCasWavesNeverLoseAnUpdateUnderConcurrentAttempts() throws InterruptedException {
        int wavesCount = 5;
        int racersPerWave = 6;

        for (int round = 0; round < 200; round++) {
            KvStoreRepository repository = new KvStoreRepository();
            KvEntry current = repository.set("wave-key", "v0", null);

            for (int wave = 0; wave < wavesCount; wave++) {
                long expectedVersion = current.getVersion();
                ExecutorService pool = Executors.newFixedThreadPool(racersPerWave);
                CountDownLatch start = new CountDownLatch(1);
                CountDownLatch done = new CountDownLatch(racersPerWave);
                AtomicInteger won = new AtomicInteger();

                for (int i = 0; i < racersPerWave; i++) {
                    final int racer = i;
                    pool.submit(() -> {
                        try {
                            start.await();
                            repository.cas("wave-key", expectedVersion, "wave-value-" + racer);
                            won.incrementAndGet();
                        } catch (VersionConflictException expected) {
                            // exactly one of these racersPerWave threads must NOT hit this branch
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                        } finally {
                            done.countDown();
                        }
                    });
                }
                start.countDown();
                assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + ", wave " + wave + " timed out");
                pool.shutdown();

                assertEquals(1, won.get(), "round " + round + ", wave " + wave + ": exactly one racer must win each wave");
                current = repository.get("wave-key");
                assertEquals(expectedVersion + 1, current.getVersion(), "round " + round + ", wave " + wave + ": version must climb by exactly 1 per wave, never skipping or double-incrementing");
            }
        }
    }
}
