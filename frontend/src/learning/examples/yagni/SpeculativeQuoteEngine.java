package com.lld.learning.examples.yagni;

import java.util.Map;

/** Executed teaching alternative, not an application feature or recommended framework. */
public final class SpeculativeQuoteEngine {
    private final Map<String, Integer> rates;

    public SpeculativeQuoteEngine(Map<String, Integer> rates) {
        if (rates == null || rates.isEmpty()) {
            throw new IllegalArgumentException("at least one service rate is required");
        }
        for (var entry : rates.entrySet()) {
            if (entry.getKey() == null || entry.getKey().isBlank()
                    || entry.getValue() == null || entry.getValue() < 1 || entry.getValue() > 10000) {
                throw new IllegalArgumentException("named rates must be between 1 and 10000 cents");
            }
        }
        this.rates = Map.copyOf(rates);
    }

    public int quoteCents(String service, int parcels) {
        if (service == null || !rates.containsKey(service)) {
            throw new IllegalArgumentException("unknown service");
        }
        if (parcels < 1 || parcels > 20) {
            throw new IllegalArgumentException("parcels must be between 1 and 20");
        }
        return parcels * rates.get(service);
    }
}
