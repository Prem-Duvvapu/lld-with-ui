package com.lld.concurrency.bloomfilter.model;

/**
 * Parameters for a {@code POST /run}. Every field is nullable so the service can
 * distinguish "caller omitted this" (apply a default) from "caller sent 0"
 * (a validation failure) — a primitive {@code int} would collapse both to zero.
 *
 * <p>The items added and queried are deliberately NOT client-supplied: the service
 * uses a fixed deterministic word list so the demonstrated false positive is
 * reproducible run after run for the same {@code bitSize}/{@code hashCount}.
 */
public record RunRequest(
        Integer bitSize,
        Integer hashCount,
        Integer addThreads
) {
}
