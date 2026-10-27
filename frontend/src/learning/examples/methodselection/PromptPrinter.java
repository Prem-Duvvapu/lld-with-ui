package com.lld.learning.examples.methodselection;

import java.io.IOException;

public class PromptPrinter {
    // These are two overloads, each with its own input contract.
    public String print(Object topic) {
        return "base Object: [" + String.valueOf(topic) + "]";
    }

    /** Requires a nonblank topic; strips its surrounding whitespace. */
    public String print(String topic) {
        return "base String: " + clean(topic);
    }

    protected final String clean(String topic) {
        if (topic == null || topic.isBlank()) {
            throw new IllegalArgumentException("Topic is required");
        }
        return topic.strip();
    }

    // The declared checked exception lets callers allow a future copying failure.
    // This small implementation performs no I/O.
    public PromptPrinter copy() throws IOException {
        return new PromptPrinter();
    }
}
