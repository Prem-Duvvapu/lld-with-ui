package com.lld.taskmanagement.model;

/** Task priority. {@link #getWeight()} feeds the ordering strategies in {@code .strategy}. */
public enum Priority {
    LOW(1),
    MEDIUM(2),
    HIGH(3),
    CRITICAL(4);

    private final int weight;

    Priority(int weight) {
        this.weight = weight;
    }

    public int getWeight() {
        return weight;
    }
}
