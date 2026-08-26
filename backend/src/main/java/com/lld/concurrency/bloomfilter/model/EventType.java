package com.lld.concurrency.bloomfilter.model;

/**
 * Every meaningful thing that happens inside {@link BloomFilter} during a run.
 *
 * <p>Recorded in order by {@link TraceRecorder} so the frontend can replay a real
 * execution instead of animating a canned one.
 */
public enum EventType {
    /** A thread is about to attempt {@code add(item)} — positions are about to be computed. */
    ADD_ATTEMPT,
    /** One of the item's hashCount bit positions was found already set by a prior item (a collision). */
    BIT_ALREADY_SET,
    /** One of the item's hashCount bit positions was unset and has just been set. */
    BIT_NEWLY_SET,
    /** Every position for this item has been set; the add is done. */
    ADD_COMPLETE,
    /** A thread is about to attempt {@code mightContain(item)}. */
    QUERY_ATTEMPT,
    /** One of the item's hashCount bit positions was checked and found set. */
    QUERY_BIT_HIT,
    /** One of the item's hashCount bit positions was checked and found unset — the query short-circuits here. */
    QUERY_BIT_MISS,
    /** Every position for this query was set — the filter reports "might contain" (true positive or false positive). */
    QUERY_RESULT_POSITIVE,
    /** At least one position was unset — the filter reports "definitely does not contain". */
    QUERY_RESULT_NEGATIVE
}
