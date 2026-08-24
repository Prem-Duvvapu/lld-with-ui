package com.lld.concurrency.ttlcache.model;

/**
 * One scripted {@code put(key, value, ttlMillis)} to perform at the start of a run
 * (time {@code 0}), before the background sweeper or any scripted {@link GetSpec}
 * runs.
 */
public record PutSpec(String key, String value, Long ttlMillis) {
}
