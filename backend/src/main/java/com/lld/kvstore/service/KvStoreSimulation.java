package com.lld.kvstore.service;

import com.lld.kvstore.command.Command;
import com.lld.kvstore.command.DeleteCommand;
import com.lld.kvstore.command.SetCommand;
import com.lld.kvstore.exception.KvSimulationException;
import com.lld.kvstore.exception.VersionConflictException;
import com.lld.kvstore.model.SimEvent;
import com.lld.kvstore.repository.KvStoreRepository;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;

/** Isolated demo state. The coordinator owns the operation gate; CAS workers never acquire it. */
final class KvStoreSimulation {
    private final KvStoreRepository repository = new KvStoreRepository();
    private final ReentrantLock operation = new ReentrantLock(true);
    private final Object eventLock = new Object();
    private final List<SimEvent> events = new ArrayList<>();
    private long nextEventId = 1;
    private Map<String, Object> lastRace;

    Map<String, Object> reset() {
        return locked(() -> {
            repository.reset();
            synchronized (eventLock) { events.clear(); }
            lastRace = null;
            log("SIM_RESET", "System", "Sandbox reset — empty store, empty in-memory WAL", null);
            return snapshotLocked();
        });
    }

    Map<String, Object> set(String key, String value, Long ttlMillis) {
        return locked(() -> {
            var entry = repository.set(key, value, ttlMillis);
            log("SET", "System", "SET '" + key + "' -> '" + value + "' (version " + entry.getVersion() + ")", null);
            return snapshotLocked();
        });
    }

    Map<String, Object> get(String key) {
        return locked(() -> {
            var entry = repository.peek(key);
            log(entry.isPresent() ? "HIT" : "MISS", "System", entry.isPresent()
                    ? "GET '" + key + "' -> '" + entry.get().getValue() + "'" : "GET '" + key + "' — no readable entry", null);
            return snapshotLocked();
        });
    }

    Map<String, Object> replay() {
        return locked(() -> {
            int count = repository.snapshot().commands().size();
            repository.replayFromWal();
            log("REPLAYED", "System", "Rebuilt sandbox mappings from " + count + " retained in-memory command(s); original expiry timestamps unchanged", null);
            return snapshotLocked();
        });
    }

    Map<String, Object> ttl() throws InterruptedException {
        operation.lockInterruptibly();
        try {
            repository.set("ttl-demo-key", "expires-soon", 1000L);
            log("SET", "System", "Set 'ttl-demo-key' with a 1-second TTL", null);
            Thread.sleep(1100); // actual server experiment, independent of browser playback speed
            boolean expired = repository.peek("ttl-demo-key").isEmpty();
            log(expired ? "TTL_EXPIRED" : "TTL_STILL_ALIVE", "System", expired
                    ? "'ttl-demo-key' is no longer readable; its expired mapping remains retained"
                    : "'ttl-demo-key' is still readable in the server check", null);
            return snapshotLocked();
        } catch (InterruptedException cancelled) {
            log("RUN_INTERRUPTED", "System", "TTL experiment interrupted; inspect the snapshot or reset before another walkthrough", null);
            throw cancelled;
        } finally { operation.unlock(); }
    }

    Map<String, Object> race(int workerCount) throws InterruptedException {
        operation.lockInterruptibly();
        try {
            lastRace = null;
            String key = "cas-race-key";
            var seed = repository.set(key, "seed", null);
            log("SET", "System", "Seeded '" + key + "' at version " + seed.getVersion(), null);
            var ready = new CountDownLatch(workerCount);
            var start = new CountDownLatch(1);
            var won = new AtomicInteger();
            var lost = new AtomicInteger();
            ExecutorService executor = Executors.newFixedThreadPool(workerCount);
            try {
                var futures = new ArrayList<Future<Void>>();
                for (int i = 1; i <= workerCount; i++) {
                    String actor = "CasWorker-" + i;
                    futures.add(executor.submit(() -> {
                        ready.countDown();
                        start.await();
                        try {
                            repository.cas(key, seed.getVersion(), "value-from-" + actor);
                            won.incrementAndGet();
                            log("CAS_WON", actor, actor + " won the CAS race — version bumped", null);
                        } catch (VersionConflictException conflict) {
                            lost.incrementAndGet();
                            log("CAS_LOST", actor, actor + " lost the CAS race — " + conflict.getMessage(), null);
                        }
                        return null;
                    }));
                }
                ready.await();
                start.countDown();
                // Future.get propagates unexpected worker failures instead of publishing false success.
                for (var future : futures) future.get();
            } finally { stopAndJoin(executor); }

            var details = new HashMap<String, Object>();
            details.put("workers", workerCount);
            details.put("expectedVersion", seed.getVersion());
            details.put("won", won.get());
            details.put("lost", lost.get());
            details.put("finalVersion", repository.peek(key).orElseThrow().getVersion());
            log("RACE_COMPLETE", "System", workerCount + " workers completed: " + won.get() + " won, " + lost.get() + " lost", details);
            lastRace = Map.copyOf(details);
            return snapshotLocked();
        } catch (InterruptedException cancelled) {
            log("RUN_INTERRUPTED", "System", "CAS experiment interrupted; all workers have stopped. Reset before another walkthrough", null);
            throw cancelled;
        } catch (ExecutionException | RuntimeException failure) {
            log("RUN_FAILED", "System", "CAS experiment failed; all workers have stopped. Reset the sandbox before continuing", null);
            throw new KvSimulationException("CAS experiment failed. Reset the sandbox before continuing.", failure);
        } finally { operation.unlock(); }
    }

    List<SimEvent> events() { return locked(this::detachedEvents); }

    Map<String, Object> snapshot() { return locked(this::snapshotLocked); }

    private Map<String, Object> snapshotLocked() {
        var state = repository.snapshot();
        long now = System.currentTimeMillis();
        var expired = state.entries().entrySet().stream()
                .filter(entry -> entry.getValue().getExpiresAtEpoch() != null && entry.getValue().getExpiresAtEpoch() <= now)
                .map(Map.Entry::getKey).sorted().toList();
        var responseEvents = detachedEvents();
        var result = new HashMap<String, Object>();
        result.put("entries", state.entries());
        result.put("storedEntryCount", state.entries().size());
        result.put("readableEntryCount", state.entries().size() - expired.size());
        result.put("expiredKeys", expired);
        result.put("snapshotAtEpoch", now);
        result.put("walSize", state.commands().size());
        result.put("wal", state.commands().stream().map(this::describe).toList());
        result.put("events", responseEvents);
        result.put("eventCount", responseEvents.size());
        if (lastRace != null) result.put("raceResult", new HashMap<>(lastRace));
        return result;
    }

    private <T> T locked(Supplier<T> action) {
        operation.lock();
        try { return action.get(); } finally { operation.unlock(); }
    }

    private void log(String type, String actor, String description, Map<String, Object> details) {
        synchronized (eventLock) {
            events.add(new SimEvent(nextEventId++, LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS")),
                    type, actor, description, details == null ? null : new HashMap<>(details)));
        }
    }

    private List<SimEvent> detachedEvents() {
        synchronized (eventLock) {
            // Current event details contain scalar race counters only, copied on ingress and egress.
            return events.stream().map(event -> new SimEvent(event.getId(), event.getTimestamp(), event.getType(),
                    event.getActor(), event.getDescription(), event.getDetails() == null ? null : new HashMap<>(event.getDetails()))).toList();
        }
    }

    private String describe(Command command) {
        if (command instanceof SetCommand set) return "SET " + set.getKey() + " = " + set.getValue() + " (v" + set.getVersion() + ")";
        if (command instanceof DeleteCommand delete) return "DELETE " + delete.getKey();
        return command.getClass().getSimpleName();
    }

    private static void stopAndJoin(ExecutorService executor) {
        executor.shutdownNow();
        boolean interrupted = false;
        // Workers perform one finite CAS. Keep the operation gate until they actually stop;
        // cancellation alone is not proof they cannot mutate the sandbox after reset.
        while (!executor.isTerminated()) {
            try { executor.awaitTermination(100, TimeUnit.MILLISECONDS); }
            catch (InterruptedException cancelled) { interrupted = true; }
        }
        if (interrupted) Thread.currentThread().interrupt();
    }
}
