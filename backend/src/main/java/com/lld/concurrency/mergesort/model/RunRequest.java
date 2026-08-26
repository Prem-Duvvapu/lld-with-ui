package com.lld.concurrency.mergesort.model;

import java.util.List;

/**
 * Parameters for a {@code POST /run}. Every field is nullable so the service can
 * distinguish "caller omitted this" (apply a default) from "caller sent 0"
 * (a validation failure) — a primitive {@code int} would collapse both to zero.
 *
 * <p>If {@code array} is supplied, that exact array is sorted (and its size takes
 * precedence over {@code size}); otherwise a random array of {@code size} elements
 * is generated.
 */
public record RunRequest(
        List<Integer> array,
        Integer size,
        Integer parallelism,
        Integer sequentialThreshold
) {
}
