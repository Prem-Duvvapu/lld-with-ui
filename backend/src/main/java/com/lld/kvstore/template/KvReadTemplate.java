package com.lld.kvstore.template;

import com.lld.kvstore.model.KvEntry;

import java.util.Map;

/**
 * Template Method: the "look up a key, decide whether it's live" flow is identical for every
 * read-only query this store offers — only what happens on a miss (throw vs. return empty)
 * varies. {@link #read} is deliberately a pure query with no side effects: it never mutates the
 * store, even for an expired entry. Genuine removal of a stale entry happens lazily, as a side
 * effect of the next SET/CAS's {@code ConcurrentHashMap#compute} on that key (or during WAL
 * replay) — the same "lazy expiry" trade-off {@code cachelibrary}'s {@code ShardedCache} makes.
 *
 * <p>{@code cas}'s own expiry check deliberately does NOT go through this template: it must
 * happen atomically inside {@code ConcurrentHashMap#compute}'s remapping function alongside the
 * version check, and a separate template-driven pre-read would reintroduce the exact
 * check-then-act race this module exists to close. This template governs only the two read
 * paths that don't need that atomicity: {@code GetOperation} (throws on a miss) and
 * {@code PeekOperation} (used by the sim snapshot to list current entries without throwing).
 */
public abstract class KvReadTemplate<T> {

    public final T read(Map<String, KvEntry> state, String key) {
        KvEntry entry = state.get(key);
        if (entry == null || isExpired(entry)) {
            return onMissing(key);
        }
        return onFound(entry);
    }

    protected abstract T onMissing(String key);

    protected abstract T onFound(KvEntry entry);

    private boolean isExpired(KvEntry entry) {
        return entry.getExpiresAtEpoch() != null && System.currentTimeMillis() >= entry.getExpiresAtEpoch();
    }
}
