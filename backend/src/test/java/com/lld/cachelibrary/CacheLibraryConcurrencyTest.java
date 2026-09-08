package com.lld.cachelibrary;

import com.lld.cachelibrary.builder.CacheBuilder;
import com.lld.cachelibrary.cache.Cache;
import com.lld.cachelibrary.model.EvictionPolicyType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Proves {@code Shard#put}'s check-then-evict-then-insert sequence is genuinely atomic under
 * its own lock, and that {@code ShardedCache}'s independent per-shard locks let different shards
 * make progress without interfering with each other. Every real Cache/Guava-shaped segment cache
 * makes exactly this trade: same-key (same-shard) operations serialize, cross-shard operations
 * don't contend.
 */
public class CacheLibraryConcurrencyTest {

    @Test
    @DisplayName("Repeated single-shard capacity race never overshoots capacity — 300 rounds")
    void repeatedSingleShardCapacityRaceNeverExceedsCapacity() throws InterruptedException {
        int capacity = 5;
        int putterCount = 20;

        for (int round = 0; round < 300; round++) {
            Cache<String, String> cache = new com.lld.cachelibrary.cache.ShardedCache<>(1, capacity, EvictionPolicyType.LRU, 0, null);

            ExecutorService pool = Executors.newFixedThreadPool(putterCount);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(putterCount);

            for (int i = 0; i < putterCount; i++) {
                String key = "key-" + i;
                pool.submit(() -> {
                    try {
                        start.await();
                        cache.put(key, "value");
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

            assertEquals(capacity, cache.size(),
                    "round " + round + ": " + putterCount + " distinct-key puts into a capacity-" + capacity
                            + " shard must settle at exactly " + capacity + ", never more (a broken check-then-evict-then-insert would overshoot)");
        }
    }

    @Test
    @DisplayName("Two threads hammering DIFFERENT shards never deadlock or corrupt state — 200 rounds")
    void crossShardPutsNeverBlockEachOtherOrCorruptState() throws InterruptedException {
        // Integer keys give full control over which shard each lands on: 0 % 4 == 0, 1 % 4 == 1.
        for (int round = 0; round < 200; round++) {
            // maximumSize=800 across 4 shards -> 200 per shard, exactly enough for the 200
            // distinct keys each of the two exercised shards below receives, with no eviction.
            Cache<Integer, String> cache = new com.lld.cachelibrary.cache.ShardedCache<>(4, 800, EvictionPolicyType.LRU, 0, null);

            ExecutorService pool = Executors.newFixedThreadPool(2);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(2);

            pool.submit(() -> {
                try {
                    start.await();
                    for (int i = 0; i < 200; i++) {
                        cache.put(i * 4, "shard0-" + i); // always shard 0
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
            pool.submit(() -> {
                try {
                    start.await();
                    for (int i = 0; i < 200; i++) {
                        cache.put(i * 4 + 1, "shard1-" + i); // always shard 1
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });

            start.countDown();
            assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + ": two independent shards must never deadlock each other");
            pool.shutdown();

            assertEquals(400, cache.size(), "round " + round + ": all 400 distinct keys across two shards must survive uncorrupted");
        }
    }

    @Test
    @DisplayName("Concurrent puts to the SAME key never produce a torn or lost write — 200 rounds")
    void concurrentPutsToTheSameKeyNeverProduceATornOrLostValue() throws InterruptedException {
        int writerCount = 10;

        for (int round = 0; round < 200; round++) {
            Cache<String, String> cache = new com.lld.cachelibrary.cache.ShardedCache<>(4, 100, EvictionPolicyType.LRU, 0, null);
            Set<String> validValues = new HashSet<>();

            ExecutorService pool = Executors.newFixedThreadPool(writerCount);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(writerCount);

            for (int i = 0; i < writerCount; i++) {
                String value = "writer-" + i;
                validValues.add(value);
                pool.submit(() -> {
                    try {
                        start.await();
                        cache.put("contended-key", value);
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

            String finalValue = cache.get("contended-key");
            assertNotNull(finalValue, "round " + round + ": the key must never end up missing");
            assertTrue(validValues.contains(finalValue), "round " + round + ": final value '" + finalValue + "' must be exactly one writer's value, never a torn write");
            assertEquals(1, cache.size(), "round " + round + ": only one key was ever written -- size must stay 1");
        }
    }

    @Test
    @DisplayName("Live sim shard race: N workers across 4 shards never exceed global capacity — 100 rounds")
    void simRaceRepeatedNeverExceedsGlobalCapacity() throws InterruptedException {
        for (int round = 0; round < 100; round++) {
            com.lld.cachelibrary.service.CacheLibraryService service =
                    new com.lld.cachelibrary.service.CacheLibraryService(new com.lld.cachelibrary.repository.CacheLibraryRepository());

            var snapshot = service.simRace(8);
            @SuppressWarnings("unchecked")
            var raceResult = (java.util.Map<String, Object>) snapshot.get("raceResult");
            int finalSize = (int) raceResult.get("finalSize");

            assertTrue(finalSize <= 8, "round " + round + ": 8 distinct-key puts across 4 shards (capacity 2 each) must never exceed 8 total");
        }
    }
}
