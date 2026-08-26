package com.lld.concurrency.mergesort.model;

/**
 * Callback {@link ParallelMergeSorter} invokes for every event worth recording, on
 * whichever real thread produced it. Kept as a tiny functional interface so the
 * sorter itself has zero knowledge of HTTP, JSON, or how a run is orchestrated — it
 * just narrates what genuinely happened, on the thread it happened on.
 */
@FunctionalInterface
public interface TraceRecorder {

    /**
     * @param type       what happened
     * @param lo         inclusive lower bound of the range this task/event concerns
     * @param hi         inclusive upper bound of the range this task/event concerns
     * @param mid        the split point — meaningful only for {@link EventType#PARTITION}
     *                    and {@link EventType#MERGE_START}; {@code null} otherwise
     * @param position   the scratch-buffer index just written — meaningful only for
     *                    {@link EventType#MERGE_WRITE}; {@code null} otherwise
     * @param value      the value just written — meaningful only for
     *                    {@link EventType#MERGE_WRITE}; {@code null} otherwise
     * @param sourceSide {@code "LEFT"} or {@code "RIGHT"}, which sub-range the written
     *                    value came from — meaningful only for
     *                    {@link EventType#MERGE_WRITE}; {@code null} otherwise
     */
    void record(EventType type, int lo, int hi, Integer mid, Integer position, Integer value, String sourceSide);

    TraceRecorder NOOP = (type, lo, hi, mid, position, value, sourceSide) -> { };
}
