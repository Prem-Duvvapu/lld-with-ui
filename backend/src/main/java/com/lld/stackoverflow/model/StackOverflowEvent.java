package com.lld.stackoverflow.model;

import java.time.Instant;
import java.util.Map;

/** One entry in the {@code /sim/*} sandbox's audit log, carrying a state snapshot. */
public record StackOverflowEvent(
        long id,
        String type,
        String actor,
        String message,
        Map<String, Object> detail,
        Instant timestamp
) {}
