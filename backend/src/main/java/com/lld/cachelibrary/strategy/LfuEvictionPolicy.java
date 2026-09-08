package com.lld.cachelibrary.strategy;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Least-frequently-used, ties broken by insertion order (the oldest of the least-frequently-used
 * keys goes first). {@code frequency} is a plain {@link LinkedHashMap} (insertion order) so a
 * linear scan for the minimum frequency naturally prefers the earliest-inserted tied key.
 */
public class LfuEvictionPolicy<K> implements EvictionPolicy<K> {

    private final Map<K, Integer> frequency = new LinkedHashMap<>();

    @Override
    public void onAccess(K key) {
        frequency.computeIfPresent(key, (k, count) -> count + 1);
    }

    @Override
    public void onInsert(K key) {
        frequency.put(key, 1);
    }

    @Override
    public void onRemove(K key) {
        frequency.remove(key);
    }

    @Override
    public K evictionCandidate() {
        K candidate = null;
        int minFrequency = Integer.MAX_VALUE;
        for (Map.Entry<K, Integer> entry : frequency.entrySet()) {
            if (entry.getValue() < minFrequency) {
                minFrequency = entry.getValue();
                candidate = entry.getKey();
            }
        }
        return candidate;
    }
}
