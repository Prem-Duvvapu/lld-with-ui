package com.lld.learning.examples;

import java.util.List;

public final class FocusedSession extends LearningSession {
    private int minutes;

    public FocusedSession(String topic, List<String> trace) {
        this(topic, 25, trace);
        trace.add("default constructor complete");
    }

    public FocusedSession(String topic, int minutes, List<String> trace) {
        super(topic, trace);
        if (minutes <= 0) {
            throw new IllegalArgumentException("Minutes must be positive");
        }
        this.minutes = minutes;
        trace.add("focused minutes=" + minutes);
    }

    public int getMinutes() {
        return minutes;
    }

    public void extend(int extraMinutes) {
        if (extraMinutes <= 0) {
            throw new IllegalArgumentException("Extra minutes must be positive");
        }
        minutes = Math.addExact(minutes, extraMinutes);
    }
}
