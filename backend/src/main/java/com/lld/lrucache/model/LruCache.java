package com.lld.lrucache.model;

import com.lld.lrucache.strategy.EvictionPolicy;
import com.lld.lrucache.strategy.EvictionPolicyType;
import com.lld.lrucache.strategy.FIFOEvictionPolicy;
import com.lld.lrucache.strategy.LFUEvictionPolicy;
import com.lld.lrucache.strategy.LRUEvictionPolicy;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

public class LruCache<K, V> {
    private int capacity;
    private final Map<K, Node<K, V>> map;
    private EvictionPolicy<K, V> evictionPolicy;
    private final ReentrantLock lock;

    // Metrics & Telemetry
    private long totalHits;
    private long totalMisses;
    private long totalEvictions;
    private final List<Map<String, Object>> logs;

    public LruCache(int capacity) {
        this.capacity = capacity;
        this.map = new ConcurrentHashMap<>();
        this.evictionPolicy = new LRUEvictionPolicy<>();
        this.lock = new ReentrantLock();
        this.totalHits = 0;
        this.totalMisses = 0;
        this.totalEvictions = 0;
        this.logs = Collections.synchronizedList(new ArrayList<>());
    }

    public V get(K key) {
        lock.lock();
        try {
            if (map.containsKey(key)) {
                Node<K, V> node = map.get(key);
                evictionPolicy.keyAccessed(node);
                totalHits++;
                addLog("GET", key.toString(), node.getValue().toString(), "HIT", "Node promoted to MRU HEAD");
                return node.getValue();
            } else {
                totalMisses++;
                addLog("GET", key.toString(), "N/A", "MISS", "Key not found in cache");
                return null;
            }
        } finally {
            lock.unlock();
        }
    }

    public void put(K key, V value) {
        lock.lock();
        try {
            if (map.containsKey(key)) {
                Node<K, V> node = map.get(key);
                node.setValue(value);
                evictionPolicy.keyAccessed(node);
                addLog("PUT", key.toString(), value.toString(), "UPDATE", "Updated existing key & moved to HEAD");
            } else {
                if (map.size() >= capacity) {
                    Node<K, V> evicted = evictionPolicy.evictKey();
                    if (evicted != null) {
                        map.remove(evicted.getKey());
                        totalEvictions++;
                        addLog("EVICT", evicted.getKey().toString(), evicted.getValue().toString(), "EVICTION",
                                "Cache capacity (" + capacity + ") reached. Evicted item.");
                    }
                }
                Node<K, V> newNode = new Node<>(key, value);
                map.put(key, newNode);
                evictionPolicy.keyInserted(newNode);
                addLog("PUT", key.toString(), value.toString(), "INSERT", "Inserted new node at HEAD");
            }
        } finally {
            lock.unlock();
        }
    }

    public boolean remove(K key) {
        lock.lock();
        try {
            if (map.containsKey(key)) {
                Node<K, V> node = map.remove(key);
                evictionPolicy.removeKey(node);
                addLog("REMOVE", key.toString(), node.getValue().toString(), "REMOVED", "Explicitly removed from cache");
                return true;
            }
            return false;
        } finally {
            lock.unlock();
        }
    }

    public void clear() {
        lock.lock();
        try {
            map.clear();
            evictionPolicy.clear();
            addLog("CLEAR", "*", "*", "CLEARED", "All cached entries cleared");
        } finally {
            lock.unlock();
        }
    }

    public void setCapacity(int newCapacity) {
        lock.lock();
        try {
            if (newCapacity <= 0) return;
            this.capacity = newCapacity;
            while (map.size() > capacity) {
                Node<K, V> evicted = evictionPolicy.evictKey();
                if (evicted != null) {
                    map.remove(evicted.getKey());
                    totalEvictions++;
                    addLog("EVICT", evicted.getKey().toString(), evicted.getValue().toString(), "RESIZE_EVICT",
                            "Capacity resized down to " + capacity + ". Evicted excess item.");
                } else {
                    break;
                }
            }
            addLog("CAPACITY", "CAPACITY", String.valueOf(newCapacity), "UPDATED", "Capacity updated to " + newCapacity);
        } finally {
            lock.unlock();
        }
    }

    public void setPolicy(EvictionPolicyType policyType) {
        lock.lock();
        try {
            List<Node<K, V>> currentNodes = evictionPolicy.getOrderedNodes();
            switch (policyType) {
                case LFU:
                    this.evictionPolicy = new LFUEvictionPolicy<>();
                    break;
                case FIFO:
                    this.evictionPolicy = new FIFOEvictionPolicy<>();
                    break;
                case LRU:
                default:
                    this.evictionPolicy = new LRUEvictionPolicy<>();
                    break;
            }
            for (Node<K, V> n : currentNodes) {
                this.evictionPolicy.keyInserted(n);
            }
            addLog("POLICY", "STRATEGY", policyType.name(), "SWAPPED", "Eviction strategy changed to " + policyType.name());
        } finally {
            lock.unlock();
        }
    }

    public int getCapacity() {
        return capacity;
    }

    public int getSize() {
        return map.size();
    }

    public EvictionPolicyType getPolicyType() {
        return evictionPolicy.getType();
    }

    public Map<String, Object> getSnapshot() {
        lock.lock();
        try {
            List<Node<K, V>> ordered = evictionPolicy.getOrderedNodes();
            List<Map<String, Object>> nodeList = new ArrayList<>();
            for (Node<K, V> n : ordered) {
                Map<String, Object> nm = new HashMap<>();
                nm.put("key", n.getKey());
                nm.put("value", n.getValue());
                nm.put("accessCount", n.getAccessCount());
                nm.put("createdAt", n.getCreatedAt());
                nm.put("lastAccessedAt", n.getLastAccessedAt());
                nodeList.add(nm);
            }

            Map<String, Object> snap = new HashMap<>();
            snap.put("capacity", capacity);
            snap.put("size", map.size());
            snap.put("policy", evictionPolicy.getType().name());
            snap.put("nodes", nodeList);
            snap.put("stats", getStats());
            snap.put("logs", new ArrayList<>(logs));
            return snap;
        } finally {
            lock.unlock();
        }
    }

    public Map<String, Object> getStats() {
        Map<String, Object> st = new HashMap<>();
        st.put("hits", totalHits);
        st.put("misses", totalMisses);
        st.put("evictions", totalEvictions);
        long totalOps = totalHits + totalMisses;
        double hitRate = totalOps > 0 ? ((double) totalHits / totalOps) * 100.0 : 0.0;
        st.put("hitRate", Math.round(hitRate * 10.0) / 10.0);
        st.put("capacity", capacity);
        st.put("size", map.size());
        return st;
    }

    private void addLog(String op, String key, String val, String status, String detail) {
        Map<String, Object> log = new HashMap<>();
        log.put("id", UUID.randomUUID().toString());
        log.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS")));
        log.put("op", op);
        log.put("key", key);
        log.put("val", val);
        log.put("status", status);
        log.put("detail", detail);
        logs.add(0, log); // Newest first
        if (logs.size() > 50) {
            logs.remove(logs.size() - 1);
        }
    }
}
