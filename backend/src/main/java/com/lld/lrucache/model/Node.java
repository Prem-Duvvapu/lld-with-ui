package com.lld.lrucache.model;

import java.time.Instant;

public class Node<K, V> {
    private K key;
    private V value;
    private Node<K, V> prev;
    private Node<K, V> next;
    private int accessCount;
    private long createdAt;
    private long lastAccessedAt;

    public Node(K key, V value) {
        this.key = key;
        this.value = value;
        this.accessCount = 1;
        long now = Instant.now().toEpochMilli();
        this.createdAt = now;
        this.lastAccessedAt = now;
    }

    public K getKey() {
        return key;
    }

    public void setKey(K key) {
        this.key = key;
    }

    public V getValue() {
        return value;
    }

    public void setValue(V value) {
        this.value = value;
    }

    public Node<K, V> getPrev() {
        return prev;
    }

    public void setPrev(Node<K, V> prev) {
        this.prev = prev;
    }

    public Node<K, V> getNext() {
        return next;
    }

    public void setNext(Node<K, V> next) {
        this.next = next;
    }

    public int getAccessCount() {
        return accessCount;
    }

    public void incrementAccessCount() {
        this.accessCount++;
        this.lastAccessedAt = Instant.now().toEpochMilli();
    }

    public long getCreatedAt() {
        return createdAt;
    }

    public long getLastAccessedAt() {
        return lastAccessedAt;
    }

    public void updateLastAccessedAt() {
        this.lastAccessedAt = Instant.now().toEpochMilli();
    }
}
