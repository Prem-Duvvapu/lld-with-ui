package com.lld.learning.examples.dry;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/** Single-threaded quote records, not orders, charges or reservations. */
public final class OrderQuotes {
    private final DeliveryFeeRule rule;
    private final Map<String, Integer> recordedFees = new HashMap<>();

    public OrderQuotes(DeliveryFeeRule rule) {
        this.rule = Objects.requireNonNull(rule, "rule");
    }

    public int preview(int subtotalCents) {
        return rule.feeCents(subtotalCents);
    }

    public int checkoutQuote(String orderId, int subtotalCents) {
        if (orderId == null || orderId.isBlank()) throw new IllegalArgumentException("Blank order id");
        int fee = rule.feeCents(subtotalCents);
        recordedFees.put(orderId, fee);
        return fee;
    }

    public int recordedFee(String orderId) {
        Integer fee = recordedFees.get(orderId);
        if (fee == null) throw new IllegalArgumentException("Unknown order id");
        return fee;
    }

    public int recordedCount() {
        return recordedFees.size();
    }
}
