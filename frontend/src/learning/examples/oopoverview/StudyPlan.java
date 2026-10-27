package com.lld.learning.examples.oopoverview;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/** Sequential, in-memory model; archive is logical retirement, not JVM deletion. */
public final class StudyPlan {
    public static final int DEFAULT_CAPACITY = 2;
    public enum State { OPEN, ARCHIVED }

    private final String name;
    private final int capacity;
    private final List<Entry> entries = new ArrayList<>();
    private State state = State.OPEN;

    public StudyPlan(String name) {
        this(name, DEFAULT_CAPACITY);
    }

    public StudyPlan(String name, int capacity) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Plan name is required");
        }
        if (capacity < 1) {
            throw new IllegalArgumentException("Capacity must be positive");
        }
        this.name = name.strip();
        this.capacity = capacity;
    }

    public String name() { return name; }
    public int capacity() { return capacity; }
    public State state() { return state; }

    /** Detached membership, shared Entry objects; not a deep historical snapshot. */
    public List<Entry> entries() {
        return List.copyOf(entries);
    }

    public Entry add(Topic topic) {
        requireOpen();
        Objects.requireNonNull(topic, "topic");
        for (Entry entry : entries) {
            if (entry.topic == topic) {
                throw new IllegalArgumentException("Topic already selected");
            }
        }
        if (entries.size() == capacity) {
            throw new IllegalStateException("Plan is full");
        }
        Entry entry = new Entry(this, topic);
        entries.add(entry);
        return entry;
    }

    public void remove(Entry entry) {
        requireOpen();
        Objects.requireNonNull(entry, "entry");
        if (entry.owner != this) {
            throw new IllegalArgumentException("Entry belongs to another plan");
        }
        entry.requireActive();
        entries.remove(entry);
        entry.retired = true;
    }

    public void archive() {
        if (state == State.ARCHIVED) return;
        for (Entry entry : entries) entry.retired = true;
        entries.clear();
        state = State.ARCHIVED;
    }

    private void requireOpen() {
        if (state != State.OPEN) throw new IllegalStateException("Plan is archived");
    }

    /** Observers may retain entries, but only their fixed owner can retire them. */
    public static final class Entry {
        private final StudyPlan owner;
        private final Topic topic;
        private boolean retired;

        private Entry(StudyPlan owner, Topic topic) {
            this.owner = owner;
            this.topic = topic;
        }

        public Topic topic() { return topic; }
        public boolean isRetired() { return retired; }

        /** Uses this call's policy without retaining it; no rollback of policy side effects. */
        public String prompt(PromptStyle style) {
            requireActive();
            return Objects.requireNonNull(style, "style").format(topic.title());
        }

        private void requireActive() {
            if (retired) throw new IllegalStateException("Entry is retired");
        }
    }
}
