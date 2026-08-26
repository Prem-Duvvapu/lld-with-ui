package com.lld.concurrency.bloomfilter.model;

import java.nio.charset.StandardCharsets;
import java.util.BitSet;
import java.util.concurrent.locks.ReentrantLock;

/**
 * A genuine Bloom filter built from scratch on {@link BitSet} — deliberately not a
 * wrapper around a third-party probabilistic-data-structure library. The whole
 * point of this module is to demonstrate the primitive itself: two independent,
 * deterministic hash functions combined via double hashing (the Kirsch–Mitzenmacher
 * technique), a shared bit array, and the central probabilistic guarantee this data
 * structure exists to make — {@code mightContain} never false-negatives for an item
 * that was actually added, but can false-positive for one that was not.
 *
 * <p>{@link BitSet} is not thread-safe, so every read and write of it happens under
 * {@code lock} — multiple adder threads race to set bits concurrently, and the lock
 * is what keeps the shared array from corrupting under contention.
 *
 * <p>Every attempt, per-bit check, and completion is reported to a
 * {@link TraceRecorder} while the lock is held, so the reported bit-set-count is
 * always exactly what the thread observed at that instant — never a race with a
 * concurrent mutator.
 */
public final class BloomFilter {

    private static final int FNV_OFFSET_BASIS = 0x811c9dc5;
    private static final int FNV_PRIME = 0x01000193;

    private final int bitSize;
    private final int hashCount;
    private final BitSet bits;
    private final ReentrantLock lock = new ReentrantLock();
    private final TraceRecorder recorder;

    public BloomFilter(int bitSize, int hashCount) {
        this(bitSize, hashCount, TraceRecorder.NOOP);
    }

    public BloomFilter(int bitSize, int hashCount, TraceRecorder recorder) {
        if (bitSize <= 0) {
            throw new IllegalArgumentException("bitSize must be positive, got " + bitSize);
        }
        if (hashCount <= 0) {
            throw new IllegalArgumentException("hashCount must be positive, got " + hashCount);
        }
        this.bitSize = bitSize;
        this.hashCount = hashCount;
        this.bits = new BitSet(bitSize);
        this.recorder = recorder == null ? TraceRecorder.NOOP : recorder;
    }

    /**
     * Adds {@code item} to the filter. Computes {@code hashCount} bit positions via
     * double hashing and sets each one, recording individually whether it was
     * already set (a collision with a previously added item) or newly set.
     */
    public void add(String item) {
        lock.lock();
        try {
            recorder.record(EventType.ADD_ATTEMPT, item, -1, bits.cardinality());
            int h1 = h1(item);
            int h2 = h2(item);
            for (int i = 0; i < hashCount; i++) {
                int pos = position(h1, h2, i);
                boolean alreadySet = bits.get(pos);
                if (!alreadySet) {
                    bits.set(pos);
                }
                recorder.record(alreadySet ? EventType.BIT_ALREADY_SET : EventType.BIT_NEWLY_SET,
                        item, pos, bits.cardinality());
            }
            recorder.record(EventType.ADD_COMPLETE, item, -1, bits.cardinality());
        } finally {
            lock.unlock();
        }
    }

    /**
     * Checks whether {@code item} might be in the filter. Never a false negative —
     * if {@code item} was genuinely added, every one of its positions is set and
     * this returns {@code true}. But that can also happen for an item never added,
     * if every one of its positions happens to have been set by other items (a
     * false positive). Short-circuits to {@code false} on the first unset position.
     */
    public boolean mightContain(String item) {
        lock.lock();
        try {
            recorder.record(EventType.QUERY_ATTEMPT, item, -1, bits.cardinality());
            int h1 = h1(item);
            int h2 = h2(item);
            for (int i = 0; i < hashCount; i++) {
                int pos = position(h1, h2, i);
                boolean set = bits.get(pos);
                recorder.record(set ? EventType.QUERY_BIT_HIT : EventType.QUERY_BIT_MISS,
                        item, pos, bits.cardinality());
                if (!set) {
                    recorder.record(EventType.QUERY_RESULT_NEGATIVE, item, -1, bits.cardinality());
                    return false;
                }
            }
            recorder.record(EventType.QUERY_RESULT_POSITIVE, item, -1, bits.cardinality());
            return true;
        } finally {
            lock.unlock();
        }
    }

    /** Number of bits currently set — a rough occupancy / fill-factor signal. */
    public int cardinalityEstimate() {
        lock.lock();
        try {
            return bits.cardinality();
        } finally {
            lock.unlock();
        }
    }

    public int bitSize() {
        return bitSize;
    }

    public int hashCount() {
        return hashCount;
    }

    /** h1: Java's specified {@code String.hashCode()} polynomial — deterministic per the JDK spec. */
    private static int h1(String s) {
        return s.hashCode();
    }

    /** h2: 32-bit FNV-1a over the UTF-8 bytes — fully independent of h1, equally deterministic. */
    private static int h2(String s) {
        int hash = FNV_OFFSET_BASIS;
        for (byte b : s.getBytes(StandardCharsets.UTF_8)) {
            hash ^= (b & 0xFF);
            hash *= FNV_PRIME;
        }
        return hash;
    }

    /** Kirsch–Mitzenmacher double hashing: {@code position_i = floorMod(h1 + i*h2, bitSize)}. */
    private int position(int h1, int h2, int i) {
        long combined = (long) h1 + (long) i * (long) h2;
        return (int) Math.floorMod(combined, (long) bitSize);
    }
}
