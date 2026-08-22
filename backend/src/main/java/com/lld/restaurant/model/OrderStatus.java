package com.lld.restaurant.model;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public enum OrderStatus {
    PLACED,
    PREPARING,
    READY,
    SERVED,
    BILLED,
    CANCELLED;

    private static final Map<OrderStatus, Set<OrderStatus>> TRANSITIONS = Map.of(
            PLACED, Collections.unmodifiableSet(EnumSet.of(PREPARING, CANCELLED)),
            PREPARING, Collections.unmodifiableSet(EnumSet.of(READY, CANCELLED)),
            READY, Collections.unmodifiableSet(EnumSet.of(SERVED)),
            SERVED, Collections.unmodifiableSet(EnumSet.of(BILLED)),
            BILLED, Collections.emptySet(),
            CANCELLED, Collections.emptySet()
    );

    public Set<OrderStatus> allowedNext() {
        return TRANSITIONS.getOrDefault(this, Collections.emptySet());
    }

    public boolean canTransitionTo(OrderStatus to) {
        if (to == null) {
            return false;
        }
        return allowedNext().contains(to);
    }
}
