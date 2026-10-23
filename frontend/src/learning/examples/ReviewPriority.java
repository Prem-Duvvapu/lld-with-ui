package com.lld.learning.examples;

import java.util.Locale;

public enum ReviewPriority {
    LOW(1), MEDIUM(2), HIGH(3);

    private final int weight;

    ReviewPriority(int weight) {
        this.weight = weight;
    }

    public int getWeight() {
        return weight;
    }

    public static ReviewPriority parse(String input) {
        if (input == null || input.isBlank()) {
            throw new IllegalArgumentException("Priority is required");
        }
        try {
            return valueOf(input.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException unknown) {
            throw new IllegalArgumentException("Unsupported priority: " + input.trim(), unknown);
        }
    }
}
