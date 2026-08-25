package com.lld.concurrency.h2o.model;

/**
 * Callback {@link H2OBonder} invokes for every event worth recording, right at
 * the moment it happens on the thread it happened on. Kept as a tiny functional
 * interface so the primitive itself has zero knowledge of HTTP, JSON, or how a
 * run is orchestrated — it just narrates what genuinely happened.
 */
@FunctionalInterface
public interface TraceRecorder {

    /**
     * @param type          what happened
     * @param item          "H", "O", or the molecule id (e.g. "H2O-3") for a bond
     * @param outputLengthNow the bonded-output character count at this instant
     */
    void record(EventType type, String item, int outputLengthNow);

    TraceRecorder NOOP = (type, item, outputLengthNow) -> { };
}
