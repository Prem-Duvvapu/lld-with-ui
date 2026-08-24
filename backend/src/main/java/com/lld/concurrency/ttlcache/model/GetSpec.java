package com.lld.concurrency.ttlcache.model;

/**
 * One scripted {@code get(key)} to perform {@code atMillis} milliseconds after the
 * run starts. The run driver thread genuinely sleeps in real time between scripted
 * gets, so a get scheduled after a key's TTL elapses really does observe either a
 * lazy expiry or a prior background eviction, depending on wall-clock timing
 * against the sweep interval.
 */
public record GetSpec(String key, Long atMillis) {
}
