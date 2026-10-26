package com.lld.learning.examples;

public class OpenPracticeQuestion implements PracticeQuestion {
    // These public members are deliberate field/static hiding counterexamples.
    public final String badge = "open";

    public static String category() {
        return "open";
    }

    @Override
    public String ask(String topic) {
        if (topic == null || topic.isBlank()) {
            throw new IllegalArgumentException("Topic is required");
        }
        return "Explain " + topic.strip();
    }
}
