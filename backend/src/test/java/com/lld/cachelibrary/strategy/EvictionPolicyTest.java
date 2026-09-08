package com.lld.cachelibrary.strategy;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** Proves the three policies genuinely diverge, not just carry different names for one rule. */
public class EvictionPolicyTest {

    @Test
    void lruEvictsTheLeastRecentlyAccessedKey() {
        EvictionPolicy<String> policy = new LruEvictionPolicy<>();
        policy.onInsert("a");
        policy.onInsert("b");
        policy.onInsert("c");
        policy.onAccess("a"); // touching "a" makes "b" the new least-recently-used

        assertEquals("b", policy.evictionCandidate());
    }

    @Test
    void lfuEvictsTheLeastFrequentlyAccessedKey() {
        EvictionPolicy<String> policy = new LfuEvictionPolicy<>();
        policy.onInsert("a");
        policy.onInsert("b");
        policy.onInsert("c");
        policy.onAccess("a");
        policy.onAccess("a");
        policy.onAccess("c");

        // a: freq 3, b: freq 1, c: freq 2 -- b is least frequent
        assertEquals("b", policy.evictionCandidate());
    }

    @Test
    void lfuBreaksTiesByInsertionOrder() {
        EvictionPolicy<String> policy = new LfuEvictionPolicy<>();
        policy.onInsert("first");
        policy.onInsert("second");
        // Both at frequency 1 -- the earlier-inserted one must be the tie-break winner.
        assertEquals("first", policy.evictionCandidate());
    }

    @Test
    void fifoEvictsTheOldestInsertedKeyRegardlessOfAccess() {
        EvictionPolicy<String> policy = new FifoEvictionPolicy<>();
        policy.onInsert("a");
        policy.onInsert("b");
        policy.onInsert("c");
        // Repeatedly touching "a" must NOT save it from FIFO eviction -- only insertion order matters.
        policy.onAccess("a");
        policy.onAccess("a");

        assertEquals("a", policy.evictionCandidate());
    }

    @Test
    void onRemoveStopsTrackingAKeyForAllThreePolicies() {
        EvictionPolicy<String> lru = new LruEvictionPolicy<>();
        lru.onInsert("a");
        lru.onRemove("a");
        assertNull(lru.evictionCandidate());

        EvictionPolicy<String> lfu = new LfuEvictionPolicy<>();
        lfu.onInsert("a");
        lfu.onRemove("a");
        assertNull(lfu.evictionCandidate());

        EvictionPolicy<String> fifo = new FifoEvictionPolicy<>();
        fifo.onInsert("a");
        fifo.onRemove("a");
        assertNull(fifo.evictionCandidate());
    }

    @Test
    void factoryCreatesAFreshInstancePerCall() {
        EvictionPolicy<String> first = EvictionPolicyFactory.create(com.lld.cachelibrary.model.EvictionPolicyType.LRU);
        EvictionPolicy<String> second = EvictionPolicyFactory.create(com.lld.cachelibrary.model.EvictionPolicyType.LRU);

        first.onInsert("only-in-first");

        assertNotSame(first, second, "each call must mint a new instance, never a shared singleton");
        assertNull(second.evictionCandidate(), "the second instance must not see the first instance's state");
    }
}
