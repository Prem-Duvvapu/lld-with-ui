package com.lld.lrucache.strategy;

import com.lld.lrucache.model.Node;

import java.util.ArrayList;
import java.util.List;

public class LRUEvictionPolicy<K, V> implements EvictionPolicy<K, V> {
    private final Node<K, V> head;
    private final Node<K, V> tail;

    public LRUEvictionPolicy() {
        this.head = new Node<>(null, null);
        this.tail = new Node<>(null, null);
        head.setNext(tail);
        tail.setPrev(head);
    }

    @Override
    public void keyAccessed(Node<K, V> node) {
        node.incrementAccessCount();
        detach(node);
        addToHead(node);
    }

    @Override
    public void keyInserted(Node<K, V> node) {
        addToHead(node);
    }

    @Override
    public Node<K, V> evictKey() {
        Node<K, V> lru = tail.getPrev();
        if (lru == head) {
            return null;
        }
        detach(lru);
        return lru;
    }

    @Override
    public void removeKey(Node<K, V> node) {
        detach(node);
    }

    @Override
    public void clear() {
        head.setNext(tail);
        tail.setPrev(head);
    }

    @Override
    public List<Node<K, V>> getOrderedNodes() {
        List<Node<K, V>> result = new ArrayList<>();
        Node<K, V> curr = head.getNext();
        while (curr != tail && curr != null) {
            result.add(curr);
            curr = curr.getNext();
        }
        return result;
    }

    @Override
    public EvictionPolicyType getType() {
        return EvictionPolicyType.LRU;
    }

    private void addToHead(Node<K, V> node) {
        node.setNext(head.getNext());
        node.setPrev(head);
        head.getNext().setPrev(node);
        head.setNext(node);
    }

    private void detach(Node<K, V> node) {
        if (node.getPrev() != null && node.getNext() != null) {
            node.getPrev().setNext(node.getNext());
            node.getNext().setPrev(node.getPrev());
            node.setPrev(null);
            node.setNext(null);
        }
    }
}
