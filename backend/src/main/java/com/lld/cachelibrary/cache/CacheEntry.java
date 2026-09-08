package com.lld.cachelibrary.cache;

/** Package-private value holder — a shard's internal map value, never exposed outside this package. */
final class CacheEntry<V> {

    private final V value;
    private final long expiresAtEpoch;

    CacheEntry(V value, long expiresAtEpoch) {
        this.value = value;
        this.expiresAtEpoch = expiresAtEpoch;
    }

    V getValue() {
        return value;
    }

    long getExpiresAtEpoch() {
        return expiresAtEpoch;
    }
}
