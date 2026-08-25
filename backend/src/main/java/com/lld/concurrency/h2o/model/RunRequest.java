package com.lld.concurrency.h2o.model;

/**
 * Parameters for a {@code POST /run}. {@code moleculeCount} is nullable so the
 * service can distinguish "caller omitted this" (apply a default) from "caller
 * sent 0" (a validation failure) — a primitive {@code int} would collapse both
 * to zero. The run always spawns exactly {@code 2 * moleculeCount} hydrogen
 * threads and {@code moleculeCount} oxygen threads, matching water's real 2:1
 * ratio.
 */
public record RunRequest(Integer moleculeCount) {
}
