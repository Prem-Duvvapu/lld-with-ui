package com.lld.shoppingcart.model;

/**
 * Order lifecycle. PROCESSING/SHIPPED/DELIVERED must be reached in ascending order -- skipping
 * an intermediate status forward (e.g. PLACED straight to SHIPPED) is fine, but a backward move,
 * a repeat of the current status, or any move out of a terminal status is not. CANCELLED is
 * reachable only from PLACED/PROCESSING and is governed by ShoppingCartService#cancelOrder's own
 * guard rather than this ordering.
 */
public enum OrderStatus {
    PLACED,
    PROCESSING,
    SHIPPED,
    DELIVERED,
    CANCELLED;

    public boolean isTerminal() {
        return this == DELIVERED || this == CANCELLED;
    }

    /** True if moving from this status to {@code next} is a legal forward progression. */
    public boolean canAdvanceTo(OrderStatus next) {
        if (isTerminal() || next == null || next == CANCELLED) {
            return false;
        }
        return next.ordinal() > this.ordinal();
    }
}
