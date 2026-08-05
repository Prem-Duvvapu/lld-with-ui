package com.lld.lrucache.strategy;

import com.lld.lrucache.model.Node;
import java.util.List;

public interface EvictionPolicy<K, V> {
    void keyAccessed(Node<K, V> node);
    void keyInserted(Node<K, V> node);
    Node<K, V> evictKey();
    void removeKey(Node<K, V> node);
    void clear();
    List<Node<K, V>> getOrderedNodes();
    EvictionPolicyType getType();
}
