package com.lld.kvstore.command;

import com.lld.kvstore.model.KvEntry;

import java.util.Map;

/**
 * Command Pattern, applied to durability/replay rather than the more familiar undo/redo use —
 * the same GoF pattern serving a genuinely different purpose. Every successful write appends one
 * {@link Command} to the {@code WriteAheadLog}; replaying the whole log against an empty map
 * from a cold start rebuilds identical state, which is exactly what {@code /sim/reset} proves.
 *
 * <p>{@code apply} mutates the raw state map directly — WAL replay is a low-level operation, not
 * a user request, so it deliberately bypasses {@code KvStoreService}'s validation and exception
 * throwing (a replayed DELETE of an already-absent key, for instance, must silently no-op, not
 * throw).
 */
public interface Command {
    void apply(Map<String, KvEntry> state);
}
