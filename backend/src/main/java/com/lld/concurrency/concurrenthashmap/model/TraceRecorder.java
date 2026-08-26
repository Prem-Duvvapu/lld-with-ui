package com.lld.concurrency.concurrenthashmap.model;

/**
 * Callback {@link StripedHashMap} invokes, still holding the relevant segment's lock,
 * for every event worth recording. Kept as a tiny functional interface so the map
 * itself has zero knowledge of HTTP, JSON, or how a run is orchestrated — it just
 * narrates what genuinely happened, on the thread it happened on.
 */
@FunctionalInterface
public interface TraceRecorder {

    /**
     * @param type          what happened
     * @param key           the key involved, or {@code null} when not applicable
     * @param valueAfter    the value now stored for {@code key} after the operation,
     *                      or {@code null} when there is none (a miss, a removal, etc.)
     * @param segmentIndex  which segment this event happened in
     * @param segmentSize   that segment's entry count at this instant
     * @param mapSize       the whole map's entry count at this instant (sum across segments)
     */
    void record(EventType type, String key, String valueAfter, int segmentIndex, int segmentSize, int mapSize);

    TraceRecorder NOOP = (type, key, valueAfter, segmentIndex, segmentSize, mapSize) -> { };
}
