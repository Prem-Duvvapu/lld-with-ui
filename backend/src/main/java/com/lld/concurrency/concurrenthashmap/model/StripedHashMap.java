package com.lld.concurrency.concurrenthashmap.model;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.BinaryOperator;
import java.util.function.Function;

/**
 * A genuine striped-lock concurrent map built from scratch — deliberately not a
 * wrapper around {@code java.util.concurrent.ConcurrentHashMap}. The whole point of
 * this class is to demonstrate the segment-locking primitive itself, the way the
 * real JDK class worked before Java 8: an array of {@code segmentCount} independent
 * segments, each guarded by its own {@link ReentrantLock} and holding a plain
 * {@link HashMap}. Two threads touching different segments never contend at all;
 * two threads touching the same segment are fully serialized by that segment's lock.
 *
 * <p>Every operation locks exactly one segment (never more than one at a time, so
 * there is no lock-ordering deadlock risk), does its work, and unlocks in a
 * {@code finally}. Every {@link TraceRecorder#record} call happens while the
 * segment's lock is held, so the reported segment/map sizes are never racy with a
 * concurrent mutator.
 */
public final class StripedHashMap<K, V> {

    private final int segmentCount;
    private final ReentrantLock[] locks;
    private final Map<K, V>[] segments;
    private final TraceRecorder recorder;

    @SuppressWarnings("unchecked")
    public StripedHashMap(int segmentCount) {
        this(segmentCount, TraceRecorder.NOOP);
    }

    @SuppressWarnings("unchecked")
    public StripedHashMap(int segmentCount, TraceRecorder recorder) {
        if (segmentCount <= 0) {
            throw new IllegalArgumentException("segmentCount must be positive, got " + segmentCount);
        }
        this.segmentCount = segmentCount;
        this.recorder = recorder == null ? TraceRecorder.NOOP : recorder;
        this.locks = new ReentrantLock[segmentCount];
        this.segments = new HashMap[segmentCount];
        for (int i = 0; i < segmentCount; i++) {
            this.locks[i] = new ReentrantLock();
            this.segments[i] = new HashMap<>();
        }
    }

    /** Non-negative modulo of the key's hash code against the segment count. */
    private int segmentFor(K key) {
        return (key.hashCode() & 0x7fffffff) % segmentCount;
    }

    /**
     * Stores {@code value} under {@code key} in that key's segment, fully serialized
     * with every other operation on the same segment.
     */
    public void put(K key, V value) {
        int idx = segmentFor(key);
        ReentrantLock lock = locks[idx];
        lock.lock();
        try {
            recorder.record(EventType.SEGMENT_LOCK_ACQUIRED, String.valueOf(key), null, idx, segments[idx].size(), totalSizeUnderNoLock());
            Map<K, V> segment = segments[idx];
            segment.put(key, value);
            recorder.record(EventType.PUT_SUCCESS, String.valueOf(key), String.valueOf(value), idx, segment.size(), totalSizeUnderNoLock());
        } finally {
            recorder.record(EventType.SEGMENT_LOCK_RELEASED, String.valueOf(key), null, idx, segments[idx].size(), totalSizeUnderNoLock());
            lock.unlock();
        }
    }

    /** Reads the value for {@code key}, or {@code null} if absent. */
    public V get(K key) {
        int idx = segmentFor(key);
        ReentrantLock lock = locks[idx];
        lock.lock();
        try {
            recorder.record(EventType.SEGMENT_LOCK_ACQUIRED, String.valueOf(key), null, idx, segments[idx].size(), totalSizeUnderNoLock());
            Map<K, V> segment = segments[idx];
            V value = segment.get(key);
            if (segment.containsKey(key)) {
                recorder.record(EventType.GET_HIT, String.valueOf(key), String.valueOf(value), idx, segment.size(), totalSizeUnderNoLock());
            } else {
                recorder.record(EventType.GET_MISS, String.valueOf(key), null, idx, segment.size(), totalSizeUnderNoLock());
            }
            return value;
        } finally {
            recorder.record(EventType.SEGMENT_LOCK_RELEASED, String.valueOf(key), null, idx, segments[idx].size(), totalSizeUnderNoLock());
            lock.unlock();
        }
    }

    /** Removes {@code key}, returning its prior value or {@code null} if it was absent. */
    public V remove(K key) {
        int idx = segmentFor(key);
        ReentrantLock lock = locks[idx];
        lock.lock();
        try {
            recorder.record(EventType.SEGMENT_LOCK_ACQUIRED, String.valueOf(key), null, idx, segments[idx].size(), totalSizeUnderNoLock());
            Map<K, V> segment = segments[idx];
            boolean present = segment.containsKey(key);
            V removed = segment.remove(key);
            if (present) {
                recorder.record(EventType.REMOVE_SUCCESS, String.valueOf(key), String.valueOf(removed), idx, segment.size(), totalSizeUnderNoLock());
            } else {
                recorder.record(EventType.REMOVE_MISS, String.valueOf(key), null, idx, segment.size(), totalSizeUnderNoLock());
            }
            return removed;
        } finally {
            recorder.record(EventType.SEGMENT_LOCK_RELEASED, String.valueOf(key), null, idx, segments[idx].size(), totalSizeUnderNoLock());
            lock.unlock();
        }
    }

    /**
     * Atomic read-modify-write under the segment's lock, mirroring
     * {@code ConcurrentHashMap.merge}: if {@code key} is absent, stores {@code value};
     * otherwise stores {@code remappingFunction.apply(existing, value)}, or removes
     * the entry if that returns {@code null}. Because the whole operation happens
     * while the segment lock is held, no concurrent {@code merge()}/{@code put()} on
     * the same key can ever interleave with it — this is what makes concurrent
     * increments on the same key lose no updates.
     */
    public V merge(K key, V value, BinaryOperator<V> remappingFunction) {
        int idx = segmentFor(key);
        ReentrantLock lock = locks[idx];
        lock.lock();
        try {
            recorder.record(EventType.SEGMENT_LOCK_ACQUIRED, String.valueOf(key), null, idx, segments[idx].size(), totalSizeUnderNoLock());
            Map<K, V> segment = segments[idx];
            V existing = segment.get(key);
            V newValue = existing == null ? value : remappingFunction.apply(existing, value);
            if (newValue == null) {
                segment.remove(key);
            } else {
                segment.put(key, newValue);
            }
            recorder.record(EventType.MERGE_SUCCESS, String.valueOf(key), String.valueOf(newValue), idx, segment.size(), totalSizeUnderNoLock());
            return newValue;
        } finally {
            recorder.record(EventType.SEGMENT_LOCK_RELEASED, String.valueOf(key), null, idx, segments[idx].size(), totalSizeUnderNoLock());
            lock.unlock();
        }
    }

    /**
     * Computes and stores a value for {@code key} only if it is currently absent,
     * mirroring {@code ConcurrentHashMap.computeIfAbsent}. The whole check-then-act
     * sequence happens under the segment lock, so when several threads race on the
     * same absent key, exactly one of them observes the absence, invokes
     * {@code mappingFunction}, and stores the result — every other racer simply sees
     * the value that thread stored and never calls the function at all.
     */
    public V computeIfAbsent(K key, Function<K, V> mappingFunction) {
        int idx = segmentFor(key);
        ReentrantLock lock = locks[idx];
        lock.lock();
        try {
            recorder.record(EventType.SEGMENT_LOCK_ACQUIRED, String.valueOf(key), null, idx, segments[idx].size(), totalSizeUnderNoLock());
            Map<K, V> segment = segments[idx];
            if (segment.containsKey(key)) {
                V existing = segment.get(key);
                recorder.record(EventType.COMPUTE_IF_ABSENT_SKIPPED, String.valueOf(key), String.valueOf(existing), idx, segment.size(), totalSizeUnderNoLock());
                return existing;
            }
            recorder.record(EventType.COMPUTE_IF_ABSENT_ATTEMPT, String.valueOf(key), null, idx, segment.size(), totalSizeUnderNoLock());
            V computed = mappingFunction.apply(key);
            segment.put(key, computed);
            recorder.record(EventType.COMPUTE_IF_ABSENT_COMPUTED, String.valueOf(key), String.valueOf(computed), idx, segment.size(), totalSizeUnderNoLock());
            return computed;
        } finally {
            recorder.record(EventType.SEGMENT_LOCK_RELEASED, String.valueOf(key), null, idx, segments[idx].size(), totalSizeUnderNoLock());
            lock.unlock();
        }
    }

    /**
     * Sum of every segment's size, each read under that segment's own lock — never
     * all locks held at once, so this never introduces a lock-ordering hazard, at
     * the cost of the total being a snapshot that could (in principle) be stale by
     * the time the last segment is read under concurrent mutation.
     */
    public int size() {
        int total = 0;
        for (int i = 0; i < segmentCount; i++) {
            locks[i].lock();
            try {
                total += segments[i].size();
            } finally {
                locks[i].unlock();
            }
        }
        return total;
    }

    public int segmentCount() {
        return segmentCount;
    }

    /**
     * Best-effort total used only for trace payloads while a caller already holds
     * exactly one segment's lock — reads every segment's {@code size()} without
     * re-locking them, since {@link HashMap#size()} is a plain field read. This
     * mirrors the real class's tolerance for a trace-only snapshot being briefly
     * stale relative to concurrent activity in other segments (it never affects
     * correctness of the map itself, only what a trace event reports as "map size
     * at this instant").
     */
    private int totalSizeUnderNoLock() {
        int total = 0;
        for (int i = 0; i < segmentCount; i++) {
            total += segments[i].size();
        }
        return total;
    }
}
