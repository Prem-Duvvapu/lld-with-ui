package com.lld.concurrency.blockingqueue.model;

/**
 * Callback {@link BoundedBlockingQueue} invokes, still holding its lock, for every
 * event worth recording. Kept as a tiny functional interface so the queue itself
 * has zero knowledge of HTTP, JSON, or how a run is orchestrated — it just narrates
 * what genuinely happened, on the thread it happened on.
 */
@FunctionalInterface
public interface TraceRecorder {

    /**
     * @param type          what happened
     * @param item          the item involved, or {@code null} when not yet known
     *                      (e.g. a dequeue attempt before anything has been taken)
     * @param queueSizeNow  the buffer's occupied slot count at this instant
     */
    void record(EventType type, String item, int queueSizeNow);

    TraceRecorder NOOP = (type, item, queueSizeNow) -> { };
}
