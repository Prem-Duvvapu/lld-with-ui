package com.lld.lrucache.strategy;

import com.lld.lrucache.model.Node;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class LFUEvictionPolicy<K, V> implements EvictionPolicy<K, V> {
    private final List<Node<K, V>> nodes = new ArrayList<>();

    @Override
    public synchronized void keyAccessed(Node<K, V> node) {
        node.incrementAccessCount();
    }

    @Override
    public synchronized void keyInserted(Node<K, V> node) {
        if (!nodes.contains(node)) {
            nodes.add(node);
        }
    }

    @Override
    public synchronized Node<K, V> evictKey() {
        if (nodes.isEmpty()) {
            return null;
        }
        Node<K, V> minNode = nodes.stream()
                .min(Comparator.comparingInt(Node<K, V>::getAccessCount)
                        .thenComparingLong(Node<K, V>::getLastAccessedAt))
                .orElse(null);

        if (minNode != null) {
            nodes.remove(minNode);
        }
        return minNode;
    }

    @Override
    public synchronized void removeKey(Node<K, V> node) {
        nodes.remove(node);
    }

    @Override
    public synchronized void clear() {
        nodes.clear();
    }

    @Override
    public synchronized List<Node<K, V>> getOrderedNodes() {
        List<Node<K, V>> copy = new ArrayList<>(nodes);
        copy.sort(Comparator.comparingInt(Node<K, V>::getAccessCount).reversed()
                .thenComparingLong(Node<K, V>::getLastAccessedAt).reversed());
        return copy;
    }

    @Override
    public EvictionPolicyType getType() {
        return EvictionPolicyType.LFU;
    }
}
