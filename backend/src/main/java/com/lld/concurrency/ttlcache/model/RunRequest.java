package com.lld.concurrency.ttlcache.model;

import java.util.List;

/**
 * Parameters for a {@code POST /run}. Every field is nullable so the service can
 * distinguish "caller omitted this" (apply a default) from "caller sent an explicit
 * empty/zero value" (a validation failure).
 */
public record RunRequest(
        Long sweepIntervalMillis,
        List<PutSpec> puts,
        List<GetSpec> gets,
        Long observeMillis
) {
}
