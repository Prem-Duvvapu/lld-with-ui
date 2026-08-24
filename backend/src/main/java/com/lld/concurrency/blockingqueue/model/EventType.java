package com.lld.concurrency.blockingqueue.model;

/**
 * Every meaningful thing that happens inside {@link BoundedBlockingQueue} during a run.
 *
 * <p>Recorded in order by {@link TraceRecorder} so the frontend can replay a real
 * execution instead of animating a canned one.
 */
public enum EventType {
    /** A producer thread is about to attempt {@code put()}. */
    ENQUEUE_ATTEMPT,
    /** The item was placed into the buffer and {@code notEmpty} was signalled. */
    ENQUEUE_SUCCESS,
    /** The producer is entering {@code notFull.await()} because the queue is full. */
    ENQUEUE_BLOCKED,
    /** A consumer thread is about to attempt {@code take()}. */
    DEQUEUE_ATTEMPT,
    /** An item was removed from the buffer and {@code notFull} was signalled. */
    DEQUEUE_SUCCESS,
    /** The consumer is entering {@code notEmpty.await()} because the queue is empty. */
    DEQUEUE_BLOCKED,
    /** Observed at capacity at the moment a producer checked. */
    QUEUE_FULL,
    /** Observed empty at the moment a consumer checked. */
    QUEUE_EMPTY
}
