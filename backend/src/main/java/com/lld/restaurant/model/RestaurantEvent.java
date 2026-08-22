package com.lld.restaurant.model;

import java.time.Instant;
import java.util.Map;

public record RestaurantEvent(
        long id,
        String type,
        String actor,
        String message,
        Map<String, Object> detail,
        Instant timestamp
) {}
