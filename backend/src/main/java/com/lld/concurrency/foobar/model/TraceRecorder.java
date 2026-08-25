package com.lld.concurrency.foobar.model;

/**
 * Callback {@link FooBarPrinter} invokes for every event worth recording, right at
 * the moment it happens on the thread it happened on. Kept as a tiny functional
 * interface so the primitive itself has zero knowledge of HTTP, JSON, or how a run
 * is orchestrated — it just narrates what genuinely happened.
 */
@FunctionalInterface
public interface TraceRecorder {

    /**
     * @param type       what happened
     * @param item       the token involved ("foo" or "bar"), or {@code null} when
     *                   not yet known (an attempt before the permit is acquired)
     * @param repetition which 1-based repetition of "foobar" this event belongs to
     */
    void record(EventType type, String item, int repetition);

    TraceRecorder NOOP = (type, item, repetition) -> { };
}
