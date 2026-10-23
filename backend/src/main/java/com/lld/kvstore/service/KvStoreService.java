package com.lld.kvstore.service;

import com.lld.kvstore.command.Command;
import com.lld.kvstore.command.DeleteCommand;
import com.lld.kvstore.command.SetCommand;
import com.lld.kvstore.exception.VersionConflictException;
import com.lld.kvstore.exception.InvalidKvRequestException;
import com.lld.kvstore.model.KvEntry;
import com.lld.kvstore.model.SimEvent;
import com.lld.kvstore.repository.KvStoreRepository;
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
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

/**
 * Facade owning the one live store and the isolated simulation engine.
 * {@link KvStoreRepository#cas} is the concurrency centerpiece — see its javadoc.
 */
@Service
public class KvStoreService {

    public static final int MAX_RACE_WORKERS = 32;

    private final KvStoreRepository repository;

    // Isolated Simulation Engine State
    private final KvStoreRepository simRepository = new KvStoreRepository();
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);

    public KvStoreService(KvStoreRepository repository) {
        this.repository = repository;
        initSimState();
    }

    public KvEntry set(String key, String value, Long ttlSeconds) {
        validateKey(key);
        validateValue(value);
        Long ttlMillis = ttlMillis(ttlSeconds);
        return repository.set(key, value, ttlMillis);
    }

    public KvEntry get(String key) {
        validateKey(key);
        return repository.get(key);
    }

    public void delete(String key) {
        validateKey(key);
        repository.delete(key);
    }

    public KvEntry cas(String key, long expectedVersion, String newValue) {
        validateKey(key);
        validateValue(newValue);
        if (expectedVersion < 1) throw new InvalidKvRequestException("Expected version must be positive");
        return repository.cas(key, expectedVersion, newValue);
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public final synchronized void initSimState() {
        simRepository.reset();
        simEventLog.clear();
        logSimEvent("SIM_RESET", "System", "Sandbox reset -- empty store, empty WAL", null);
    }

    public Map<String, Object> simSet(String key, String value, Long ttlSeconds) {
        validateKey(key);
        validateValue(value);
        Long ttlMillis = ttlMillis(ttlSeconds);
        KvEntry entry = simRepository.set(key, value, ttlMillis);
        logSimEvent("SET", "System", String.format("SET '%s' -> '%s' (version %d)", key, value, entry.getVersion()), null);
        return getSimSnapshots();
    }

    public Map<String, Object> simGet(String key) {
        validateKey(key);
        var maybeEntry = simRepository.peek(key);
        if (maybeEntry.isPresent()) {
            logSimEvent("HIT", "System", "GET '" + key + "' -> '" + maybeEntry.get().getValue() + "'", null);
        } else {
            logSimEvent("MISS", "System", "GET '" + key + "' -- no entry", null);
        }
        return getSimSnapshots();
    }

    /** Rebuilds sandbox state from its retained in-memory WAL, not from persistent storage. */
    public Map<String, Object> simReplayDemo() {
        int commandCountBefore = simRepository.snapshot().commands().size();
        simRepository.replayFromWal();
        logSimEvent("REPLAYED", "System", String.format(
                "Cleared live state and replayed all %d WAL command(s) -- state rebuilt from nothing", commandCountBefore), null);
        return getSimSnapshots();
    }

    /** Configures a short TTL, sets a key, waits it out, then proves the key is genuinely gone. */
    public Map<String, Object> simTtlExpiryDemo() throws InterruptedException {
        simRepository.set("ttl-demo-key", "expires-soon", 1000L);
        logSimEvent("SET", "System", "Set 'ttl-demo-key' with a 1-second TTL", null);
        Thread.sleep(1100);
        var maybeEntry = simRepository.peek("ttl-demo-key");
        logSimEvent(maybeEntry.isEmpty() ? "TTL_EXPIRED" : "TTL_STILL_ALIVE", "System",
                maybeEntry.isEmpty() ? "'ttl-demo-key' expired as expected" : "'ttl-demo-key' unexpectedly still alive", null);
        return getSimSnapshots();
    }

    /**
     * Live demonstration of the CAS race: {@code workerCount} threads all race to CAS the same
     * key using the SAME {@code expectedVersion}. Not {@code synchronized} -- a method-level
     * lock here would serialize every worker before any of them reached
     * {@link KvStoreRepository#cas}'s {@code ConcurrentHashMap#compute} call, and the race this
     * module exists to demonstrate would never actually happen.
     */
    public Map<String, Object> simCasRace(long requestedWorkers) throws InterruptedException {
        if (requestedWorkers < 1 || requestedWorkers > MAX_RACE_WORKERS) {
            throw new InvalidKvRequestException("Worker count must be between 1 and " + MAX_RACE_WORKERS);
        }
        int workerCount = (int) requestedWorkers;
        String key = "cas-race-key";
        KvEntry seed = simRepository.set(key, "seed", null);
        logSimEvent("SET", "System", "Seeded '" + key + "' at version " + seed.getVersion(), null);

        ExecutorService executor = Executors.newFixedThreadPool(workerCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(workerCount);
        AtomicInteger won = new AtomicInteger(0);
        AtomicInteger lost = new AtomicInteger(0);

        for (int i = 0; i < workerCount; i++) {
            String workerId = "CasWorker-" + (i + 1);
            executor.submit(() -> {
                try {
                    startLatch.await();
                    simRepository.cas(key, seed.getVersion(), "value-from-" + workerId);
                    won.incrementAndGet();
                    logSimEvent("CAS_WON", workerId, workerId + " won the CAS race -- version bumped", null);
                } catch (VersionConflictException e) {
                    lost.incrementAndGet();
                    logSimEvent("CAS_LOST", workerId, workerId + " lost the CAS race -- " + e.getMessage(), null);
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
        details.put("won", won.get());
        details.put("lost", lost.get());
        details.put("finalVersion", simRepository.peek(key).map(KvEntry::getVersion).orElse(-1L));
        logSimEvent("RACE_COMPLETE", "System", String.format(
                "%d workers raced CAS on '%s' with expectedVersion=%d -- %d won, %d lost, final version %s",
                workerCount, key, seed.getVersion(), won.get(), lost.get(), details.get("finalVersion")), details);

        Map<String, Object> snapshot = getSimSnapshots();
        snapshot.put("raceResult", details);
        return snapshot;
    }

    public List<SimEvent> getSimEvents() {
        return simEventLog;
    }

    public Map<String, Object> getSimSnapshots() {
        KvStoreRepository.Snapshot state = simRepository.snapshot();
        Map<String, Object> res = new HashMap<>();
        res.put("entries", state.entries());
        res.put("walSize", state.commands().size());
        res.put("wal", describeWal(state.commands()));
        res.put("events", simEventLog);
        return res;
    }

    private List<String> describeWal(List<Command> commands) {
        return commands.stream().map(this::describeCommand).collect(Collectors.toList());
    }

    private String describeCommand(Command command) {
        if (command instanceof SetCommand set) {
            return "SET " + set.getKey() + " = " + set.getValue() + " (v" + set.getVersion() + ")";
        }
        if (command instanceof DeleteCommand delete) {
            return "DELETE " + delete.getKey();
        }
        return command.getClass().getSimpleName();
    }

    private void logSimEvent(String type, String actor, String desc, Map<String, Object> data) {
        String ts = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
        SimEvent event = new SimEvent(simEventIdGen.getAndIncrement(), ts, type, actor, desc, data);
        simEventLog.add(event);
    }

    private static void validateKey(String key) {
        if (key == null || key.isBlank()) throw new InvalidKvRequestException("Key must not be blank");
    }

    private static void validateValue(String value) {
        if (value == null) throw new InvalidKvRequestException("Value must be a string; an empty string is allowed");
    }

    private static Long ttlMillis(Long seconds) {
        if (seconds == null) return null;
        if (seconds < 1) throw new InvalidKvRequestException("TTL must be positive whole seconds, or null for no expiry");
        try {
            return Math.multiplyExact(seconds, 1000L);
        } catch (ArithmeticException overflow) {
            throw new InvalidKvRequestException("TTL is too large to represent in milliseconds");
        }
    }
}
