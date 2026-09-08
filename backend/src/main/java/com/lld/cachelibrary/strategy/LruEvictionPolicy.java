package com.lld.cachelibrary.strategy;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Least-recently-used: a {@link LinkedHashMap} in access order does exactly this bookkeeping
 * natively, so {@link #onAccess} and {@link #onInsert} both reduce to one {@code get}/{@code put}
 * — the eldest entry (iteration order) is always the least-recently-used key.
 */
public class LruEvictionPolicy<K> implements EvictionPolicy<K> {

    private final Map<K, Boolean> order = new LinkedHashMap<>(16, 0.75f, true);

    @Override
    public void onAccess(K key) {
        order.get(key);
    }

    @Override
    public void onInsert(K key) {
        order.put(key, Boolean.TRUE);
    }

    @Override
    public void onRemove(K key) {
        order.remove(key);
    }

    @Override
    public K evictionCandidate() {
        return order.isEmpty() ? null : order.keySet().iterator().next();
    }
}
