package com.lld.concurrency.concurrenthashmap.model;

/**
 * Every meaningful thing that happens inside {@link StripedHashMap} during a run.
 *
 * <p>Recorded in order by {@link TraceRecorder} so the frontend can replay a real
 * execution instead of animating a canned one.
 */
public enum EventType {
    /** A thread has just acquired the {@code ReentrantLock} guarding a segment. */
    SEGMENT_LOCK_ACQUIRED,
    /** A thread is about to release the segment lock it was holding. */
    SEGMENT_LOCK_RELEASED,
    /** {@code put()} stored a value into a segment. */
    PUT_SUCCESS,
    /** {@code get()} found the key present in its segment. */
    GET_HIT,
    /** {@code get()} did not find the key in its segment. */
    GET_MISS,
    /** {@code remove()} found and removed the key from its segment. */
    REMOVE_SUCCESS,
    /** {@code remove()} found nothing to remove for that key. */
    REMOVE_MISS,
    /** {@code merge()} completed its atomic read-modify-write under the segment lock. */
    MERGE_SUCCESS,
    /** {@code computeIfAbsent()} found the key absent and is about to invoke the mapping function. */
    COMPUTE_IF_ABSENT_ATTEMPT,
    /** {@code computeIfAbsent()} finished invoking the mapping function and stored its result. */
    COMPUTE_IF_ABSENT_COMPUTED,
    /** {@code computeIfAbsent()} found the key already present, so the mapping function was never called. */
    COMPUTE_IF_ABSENT_SKIPPED
}
