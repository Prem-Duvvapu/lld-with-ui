package com.lld.kvstore.service;

import com.lld.kvstore.exception.InvalidKvRequestException;
import com.lld.kvstore.model.KvEntry;
import com.lld.kvstore.model.SimEvent;
import com.lld.kvstore.repository.KvStoreRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/** Facade owning the live store and a separate sandbox operation coordinator. */
@Service
public class KvStoreService {
    public static final int MAX_RACE_WORKERS = 32;
    private final KvStoreRepository repository;
    private final KvStoreSimulation simulation = new KvStoreSimulation();

    public KvStoreService(KvStoreRepository repository) {
        this.repository = repository;
        initSimState();
    }

    public KvEntry set(String key, String value, Long ttlSeconds) {
        validateKey(key);
        validateValue(value);
        return repository.set(key, value, ttlMillis(ttlSeconds));
    }

    public KvEntry get(String key) { validateKey(key); return repository.get(key); }
    public void delete(String key) { validateKey(key); repository.delete(key); }

    public KvEntry cas(String key, long expectedVersion, String newValue) {
        validateKey(key);
        validateValue(newValue);
        if (expectedVersion < 1) throw new InvalidKvRequestException("Expected version must be positive");
        return repository.cas(key, expectedVersion, newValue);
    }

    public final void initSimState() { simulation.reset(); }
    public Map<String, Object> simReset() { return simulation.reset(); }

    public Map<String, Object> simSet(String key, String value, Long ttlSeconds) {
        validateKey(key);
        validateValue(value);
        return simulation.set(key, value, ttlMillis(ttlSeconds));
    }

    public Map<String, Object> simGet(String key) { validateKey(key); return simulation.get(key); }
    public Map<String, Object> simReplayDemo() { return simulation.replay(); }
    public Map<String, Object> simTtlExpiryDemo() throws InterruptedException { return simulation.ttl(); }

    public Map<String, Object> simCasRace(long requestedWorkers) throws InterruptedException {
        if (requestedWorkers < 1 || requestedWorkers > MAX_RACE_WORKERS) {
            throw new InvalidKvRequestException("Worker count must be between 1 and " + MAX_RACE_WORKERS);
        }
        return simulation.race((int) requestedWorkers);
    }

    public List<SimEvent> getSimEvents() { return simulation.events(); }
    public Map<String, Object> getSimSnapshots() { return simulation.snapshot(); }

    private static void validateKey(String key) {
        if (key == null || key.isBlank()) throw new InvalidKvRequestException("Key must not be blank");
    }

    private static void validateValue(String value) {
        if (value == null) throw new InvalidKvRequestException("Value must be a string; an empty string is allowed");
    }

    private static Long ttlMillis(Long seconds) {
        if (seconds == null) return null;
        if (seconds < 1) throw new InvalidKvRequestException("TTL must be positive whole seconds, or null for no expiry");
        try { return Math.multiplyExact(seconds, 1000L); }
        catch (ArithmeticException overflow) { throw new InvalidKvRequestException("TTL is too large to represent in milliseconds"); }
    }
}
