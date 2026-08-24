package com.lld.musicstreaming.model;

import java.time.Instant;
import java.util.Map;

/** One entry in the /sim/* sandbox's event log, rendered by the Simulation tab's timeline. */
public record MusicStreamingEvent(
        long id,
        String type,
        String actor,
        String message,
        Map<String, Object> detail,
        Instant timestamp
) {}
