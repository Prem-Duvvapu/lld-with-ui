package com.lld.cachelibrary.cache;

import java.util.concurrent.atomic.AtomicLong;

/** Plain counters, safe to increment from any thread — never mutated under a shard's lock. */
public class CacheStats {

    private final AtomicLong hits = new AtomicLong();
    private final AtomicLong misses = new AtomicLong();
    private final AtomicLong evictions = new AtomicLong();

    void recordHit() {
        hits.incrementAndGet();
    }

    void recordMiss() {
        misses.incrementAndGet();
    }

    /** Public: wired as an eviction-listener target from {@link com.lld.cachelibrary.builder.CacheBuilder}. */
    public void recordEviction() {
        evictions.incrementAndGet();
    }

    public long getHits() {
        return hits.get();
    }

    public long getMisses() {
        return misses.get();
    }

    public long getEvictions() {
        return evictions.get();
    }
}
