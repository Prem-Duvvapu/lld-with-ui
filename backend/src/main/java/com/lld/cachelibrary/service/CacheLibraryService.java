package com.lld.cachelibrary.service;

import com.lld.cachelibrary.builder.CacheBuilder;
import com.lld.cachelibrary.cache.Cache;
import com.lld.cachelibrary.cache.CacheStats;
import com.lld.cachelibrary.cache.StatsDecorator;
import com.lld.cachelibrary.exception.KeyNotFoundException;
import com.lld.cachelibrary.model.CacheConfig;
import com.lld.cachelibrary.model.EvictionPolicyType;
import com.lld.cachelibrary.model.SimEvent;
import com.lld.cachelibrary.repository.CacheLibraryRepository;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;

/**
 * Facade owning the one live configured cache and the isolated simulation engine.
 * {@link com.lld.cachelibrary.cache.ShardedCache} (built via {@link CacheBuilder}) is the
 * concurrency centerpiece — see its javadoc for the shard-lock race it closes.
 */
@Service
public class CacheLibraryService {

    private final CacheLibraryRepository repository;

    // Isolated Simulation Engine State
    private final CacheLibraryRepository simRepository = new CacheLibraryRepository();
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);

    public CacheLibraryService(CacheLibraryRepository repository) {
        this.repository = repository;
        configure(defaultConfig(100, EvictionPolicyType.LRU, 0, true, 8));
        initSimState();
    }

    private CacheConfig defaultConfig(int maximumSize, EvictionPolicyType policy, long ttlSeconds, boolean withStats, int shardCount) {
        return CacheConfig.builder()
                .maximumSize(maximumSize)
                .evictionPolicy(policy)
                .ttlSeconds(ttlSeconds)
                .withStats(withStats)
                .shardCount(shardCount)
                .build();
    }

    public CacheConfig configure(CacheConfig config) {
        return configure(repository, config, null);
    }

    private CacheConfig configure(CacheLibraryRepository targetRepository, CacheConfig config, Consumer<String> evictionListener) {
        CacheBuilder<String, String> builder = CacheBuilder.<String, String>newBuilder()
                .maximumSize(config.getMaximumSize())
                .evictionPolicy(config.getEvictionPolicy())
                .ttlSeconds(config.getTtlSeconds())
                .shardCount(config.getShardCount() > 0 ? config.getShardCount() : 8);
        if (config.isWithStats()) {
            builder.withStats();
        }
        if (evictionListener != null) {
            builder.onEviction(evictionListener);
        }
        Cache<String, String> cache = builder.build();
        CacheStats stats = (cache instanceof StatsDecorator) ? ((StatsDecorator<String, String>) cache).getStats() : null;
        targetRepository.configure(config, cache, stats);
        return config;
    }

    public String get(String key) {
        String value = repository.getCache().get(key);
        if (value == null) {
            throw new KeyNotFoundException("No cache entry for key: " + key);
        }
        return value;
    }

    public void put(String key, String value) {
        repository.getCache().put(key, value);
    }

    public CacheStats getStats() {
        CacheStats stats = repository.getStats();
        return stats != null ? stats : new CacheStats();
    }

    public CacheConfig getConfig() {
        return repository.getConfig();
    }

    public int size() {
        return repository.getCache().size();
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public final synchronized void initSimState() {
        simEventLog.clear();
        configure(simRepository, defaultConfig(3, EvictionPolicyType.LRU, 0, true, 1),
                evictedKey -> logSimEvent("EVICTION", "System", "Evicted key '" + evictedKey + "' to make room", null));
        logSimEvent("SIM_RESET", "System", "Sandbox reset -- cache configured maxSize=3, LRU, 1 shard, stats on", null);
    }

    public Map<String, Object> simConfigure(CacheConfig config) {
        configure(simRepository, config,
                evictedKey -> logSimEvent("EVICTION", "System", "Evicted key '" + evictedKey + "' to make room", null));
        logSimEvent("CONFIGURED", "System", String.format(
                "Reconfigured: maxSize=%d, policy=%s, ttlSeconds=%d, shards=%d, stats=%s",
                config.getMaximumSize(), config.getEvictionPolicy(), config.getTtlSeconds(), config.getShardCount(), config.isWithStats()), null);
        return getSimSnapshots();
    }

    public Map<String, Object> simPut(String key, String value) {
        simRepository.getCache().put(key, value);
        logSimEvent("PUT", "System", "Put key '" + key + "'", null);
        return getSimSnapshots();
    }

    public Map<String, Object> simGet(String key) {
        String value = simRepository.getCache().get(key);
        if (value != null) {
            logSimEvent("HIT", "System", "Cache hit for key '" + key + "'", null);
        } else {
            logSimEvent("MISS", "System", "Cache miss for key '" + key + "'", null);
        }
        return getSimSnapshots();
    }

    /** Configures a 1-second TTL, puts a key, waits it out, then proves the key is gone. */
    public Map<String, Object> simTtlExpiryDemo() throws InterruptedException {
        configure(simRepository, defaultConfig(5, EvictionPolicyType.LRU, 1, true, 1),
                evictedKey -> logSimEvent("EVICTION", "System", "Evicted key '" + evictedKey + "' to make room", null));
        simRepository.getCache().put("ttl-demo-key", "expires-soon");
        logSimEvent("PUT", "System", "Put 'ttl-demo-key' with a 1-second TTL", null);
        Thread.sleep(1100);
        String value = simRepository.getCache().get("ttl-demo-key");
        logSimEvent(value == null ? "TTL_EXPIRED" : "TTL_STILL_ALIVE", "System",
                value == null ? "'ttl-demo-key' expired as expected" : "'ttl-demo-key' unexpectedly still alive", null);
        return getSimSnapshots();
    }

    /**
     * Live demonstration of shard independence: {@code workerCount} threads concurrently PUT
     * distinct keys spread across a 4-shard cache. Not {@code synchronized} -- a method-level
     * lock here would serialize every worker before any of them reached a shard's own lock, and
     * the "different shards never block each other" property this module exists to demonstrate
     * would never actually be exercised.
     */
    public Map<String, Object> simRace(int workerCount) throws InterruptedException {
        configure(simRepository, defaultConfig(8, EvictionPolicyType.LRU, 0, true, 4),
                evictedKey -> logSimEvent("EVICTION", "System", "Evicted key '" + evictedKey + "' to make room", null));
        Cache<String, String> cache = simRepository.getCache();

        ExecutorService executor = Executors.newFixedThreadPool(workerCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(workerCount);

        for (int i = 0; i < workerCount; i++) {
            String key = "race-key-" + i;
            String workerId = "RaceWorker-" + (i + 1);
            executor.submit(() -> {
                try {
                    startLatch.await();
                    cache.put(key, "value-from-" + workerId);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }
        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        Map<String, Object> details = new HashMap<>();
        details.put("workers", workerCount);
        details.put("finalSize", cache.size());
        logSimEvent("RACE_COMPLETE", "System", String.format(
                "%d workers concurrently put distinct keys across 4 shards -- final size %d (capacity 8)", workerCount, cache.size()), details);

        Map<String, Object> snapshot = getSimSnapshots();
        snapshot.put("raceResult", details);
        return snapshot;
    }

    public List<SimEvent> getSimEvents() {
        return simEventLog;
    }

    public Map<String, Object> getSimSnapshots() {
        Map<String, Object> res = new HashMap<>();
        res.put("config", simRepository.getConfig());
        res.put("size", simRepository.getCache().size());
        CacheStats stats = simRepository.getStats();
        res.put("stats", stats != null ? stats : new CacheStats());
        res.put("events", simEventLog);
        return res;
    }

    private void logSimEvent(String type, String actor, String desc, Map<String, Object> data) {
        String ts = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
        SimEvent event = new SimEvent(simEventIdGen.getAndIncrement(), ts, type, actor, desc, data);
        simEventLog.add(event);
    }
}
