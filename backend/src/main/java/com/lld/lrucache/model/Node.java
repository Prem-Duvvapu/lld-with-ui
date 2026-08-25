package com.lld.lrucache.model;

import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
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

    public void incrementAccessCount() {
        this.accessCount++;
        this.lastAccessedAt = Instant.now().toEpochMilli();
    }

    public void updateLastAccessedAt() {
        this.lastAccessedAt = Instant.now().toEpochMilli();
    }
}
