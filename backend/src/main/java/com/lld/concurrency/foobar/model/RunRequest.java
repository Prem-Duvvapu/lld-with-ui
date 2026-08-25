package com.lld.concurrency.foobar.model;

/**
 * Parameters for a {@code POST /run}. {@code n} is nullable so the service can
 * distinguish "caller omitted this" (apply a default) from "caller sent 0"
 * (a validation failure) — a primitive {@code int} would collapse both to zero.
 */
public record RunRequest(Integer n) {
}
