package com.lld.concurrency.bloomfilter.model;

/**
 * Callback {@link BloomFilter} invokes, still holding its lock, for every event
 * worth recording. Kept as a tiny functional interface so the filter itself has
 * zero knowledge of HTTP, JSON, or how a run is orchestrated — it just narrates
 * what genuinely happened, on the thread it happened on.
 */
@FunctionalInterface
public interface TraceRecorder {

    /**
     * @param type          what happened
     * @param item          the item involved
     * @param bitIndex      the specific bit position this event concerns, or {@code -1}
     *                      for whole-operation events ({@code ADD_ATTEMPT}/{@code ADD_COMPLETE}/
     *                      {@code QUERY_ATTEMPT}/{@code QUERY_RESULT_POSITIVE}/
     *                      {@code QUERY_RESULT_NEGATIVE}) that aren't about one specific bit
     * @param bitsSetSoFar  {@code BitSet.cardinality()} at this instant
     */
    void record(EventType type, String item, int bitIndex, int bitsSetSoFar);

    TraceRecorder NOOP = (type, item, bitIndex, bitsSetSoFar) -> { };
}
