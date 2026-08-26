package com.lld.concurrency.concurrenthashmap.model;

/**
 * Parameters for a {@code POST /run}. Every field is nullable so the service can
 * distinguish "caller omitted this" (apply a default) from "caller sent 0"
 * (a validation failure) — a primitive {@code int} would collapse both to zero.
 */
public record RunRequest(
        Integer segments,
        Integer threads,
        Integer incrementsPerThread,
        Integer distinctKeys,
        Integer computeRacers
) {
}
