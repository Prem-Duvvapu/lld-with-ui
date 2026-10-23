package com.lld.kvstore.command;

import com.lld.kvstore.model.KvEntry;

import java.util.Map;

/**
 * Command Pattern applied to in-memory reconstruction. Every successful write appends one
 * {@link Command} inside its atomic map update. Replaying commands in their recorded order
 * rebuilds state while the repository excludes concurrent key operations. The log is lost on
 * process restart; {@code /sim/replay} reconstructs state and {@code /sim/reset} clears both.
 *
 * <p>{@code apply} mutates the raw state map directly — WAL replay is a low-level operation, not
 * a user request, so it deliberately bypasses {@code KvStoreService}'s validation and exception
 * throwing (a replayed DELETE of an already-absent key, for instance, must silently no-op, not
 * throw).
 */
public interface Command {
    void apply(Map<String, KvEntry> state);
}
