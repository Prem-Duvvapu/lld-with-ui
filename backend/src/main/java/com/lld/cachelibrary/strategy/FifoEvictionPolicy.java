package com.lld.cachelibrary.strategy;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * First-in-first-out: never reacts to access, only to insertion order. A {@link LinkedHashSet}
 * gives O(1) insert/remove while preserving that order, so the head of iteration is always the
 * oldest surviving key.
 */
public class FifoEvictionPolicy<K> implements EvictionPolicy<K> {

    private final Set<K> insertionOrder = new LinkedHashSet<>();

    @Override
    public void onAccess(K key) {
        // FIFO deliberately ignores access -- only insertion order determines eviction order.
    }

    @Override
    public void onInsert(K key) {
        insertionOrder.add(key);
    }

    @Override
    public void onRemove(K key) {
        insertionOrder.remove(key);
    }

    @Override
    public K evictionCandidate() {
        return insertionOrder.isEmpty() ? null : insertionOrder.iterator().next();
    }
}
