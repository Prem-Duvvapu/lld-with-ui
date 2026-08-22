package com.lld.restaurant.model;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public enum TableStatus {
    AVAILABLE,
    RESERVED,
    OCCUPIED;

    private static final Map<TableStatus, Set<TableStatus>> TRANSITIONS = Map.of(
            AVAILABLE, Collections.unmodifiableSet(EnumSet.of(RESERVED, OCCUPIED)),
            RESERVED, Collections.unmodifiableSet(EnumSet.of(OCCUPIED, AVAILABLE)),
            OCCUPIED, Collections.unmodifiableSet(EnumSet.of(AVAILABLE))
    );

    public Set<TableStatus> allowedNext() {
        return TRANSITIONS.getOrDefault(this, Collections.emptySet());
    }

    public boolean canTransitionTo(TableStatus to) {
        if (to == null) {
            return false;
        }
        return allowedNext().contains(to);
    }
}
