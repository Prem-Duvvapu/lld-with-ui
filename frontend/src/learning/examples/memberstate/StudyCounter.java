package com.lld.learning.examples.memberstate;

import java.util.List;

/** Single-threaded teaching model: static does not make created++ atomic. */
public class StudyCounter {
    public static final int DEFAULT_MINUTES = 25; // Compile-time constant.
    // Counts completed base constructor bodies, including those of subclass objects.
    // Later subclass failure and garbage collection do not undo this count.
    private static int created = initializeClass();

    private int completed = initializeInstance();
    private final int id;
    private final String topic;

    private static int initializeClass() {
        InitializationLog.record("class initializer");
        return 0;
    }

    private int initializeInstance() {
        InitializationLog.record("instance initializer");
        return 0;
    }

    public StudyCounter(String topic) {
        if (topic == null || topic.isBlank()) {
            throw new IllegalArgumentException("Topic is required");
        }
        this.topic = topic.strip();
        this.id = ++created;
        InitializationLog.record("constructor #" + id);
    }

    public void complete() { completed = Math.incrementExact(completed); }
    public int completed() { return completed; }
    public int id() { return id; }
    public String topic() { return topic; }
    public String description() { return "study: " + topic; }

    public static int createdCount() { return created; }
    public static String category() { return "study"; }
    public static List<String> initializationTrace() { return InitializationLog.snapshot(); }
}
