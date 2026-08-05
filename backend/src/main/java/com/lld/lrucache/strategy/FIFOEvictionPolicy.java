package com.lld.lrucache.strategy;

import com.lld.lrucache.model.Node;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class FIFOEvictionPolicy<K, V> implements EvictionPolicy<K, V> {
    private final List<Node<K, V>> queue = new ArrayList<>();

    @Override
    public synchronized void keyAccessed(Node<K, V> node) {
        node.updateLastAccessedAt();
    }

    @Override
    public synchronized void keyInserted(Node<K, V> node) {
        if (!queue.contains(node)) {
            queue.add(node);
        }
    }

    @Override
    public synchronized Node<K, V> evictKey() {
        if (queue.isEmpty()) {
            return null;
        }
        return queue.remove(0);
    }

    @Override
    public synchronized void removeKey(Node<K, V> node) {
        queue.remove(node);
    }

    @Override
    public synchronized void clear() {
        queue.clear();
    }

    @Override
    public synchronized List<Node<K, V>> getOrderedNodes() {
        List<Node<K, V>> copy = new ArrayList<>(queue);
        copy.sort(Comparator.comparingLong(Node<K, V>::getCreatedAt).reversed());
        return copy;
    }

    @Override
    public EvictionPolicyType getType() {
        return EvictionPolicyType.FIFO;
    }
}
