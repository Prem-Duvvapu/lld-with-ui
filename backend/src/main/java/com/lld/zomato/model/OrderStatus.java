package com.lld.zomato.model;

import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public enum OrderStatus {
    PLACED,
    CONFIRMED,
    PREPARING,
    READY_FOR_PICKUP,
    OUT_FOR_DELIVERY,
    DELIVERED,
    CANCELLED;

    private static final Map<OrderStatus, Set<OrderStatus>> TRANSITIONS = new EnumMap<>(OrderStatus.class);

    static {
        TRANSITIONS.put(PLACED, Collections.unmodifiableSet(EnumSet.of(CONFIRMED, CANCELLED)));
        TRANSITIONS.put(CONFIRMED, Collections.unmodifiableSet(EnumSet.of(PREPARING, CANCELLED)));
        TRANSITIONS.put(PREPARING, Collections.unmodifiableSet(EnumSet.of(READY_FOR_PICKUP, CANCELLED)));
        TRANSITIONS.put(READY_FOR_PICKUP, Collections.unmodifiableSet(EnumSet.of(OUT_FOR_DELIVERY, CANCELLED)));
        TRANSITIONS.put(OUT_FOR_DELIVERY, Collections.unmodifiableSet(EnumSet.of(DELIVERED)));
        TRANSITIONS.put(DELIVERED, Collections.unmodifiableSet(EnumSet.noneOf(OrderStatus.class)));
        TRANSITIONS.put(CANCELLED, Collections.unmodifiableSet(EnumSet.noneOf(OrderStatus.class)));
    }

    public Set<OrderStatus> allowedNext() {
        return TRANSITIONS.getOrDefault(this, Collections.emptySet());
    }

    public boolean canTransitionTo(OrderStatus to) {
        return to != null && allowedNext().contains(to);
    }

    public boolean isTerminal() {
        return allowedNext().isEmpty();
    }
}
