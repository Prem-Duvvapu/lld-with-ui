package com.lld.zomato.model;

import java.time.Instant;
import java.util.Map;

public record ZomatoEvent(
        long id,
        String type,
        String actor,
        String message,
        Map<String, Object> detail,
        Instant timestamp
) {}
