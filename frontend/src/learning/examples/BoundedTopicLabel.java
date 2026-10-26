package com.lld.learning.examples;

public abstract class BoundedTopicLabel implements TopicLabel {
    private final int maxChars;

    protected BoundedTopicLabel(int maxChars) {
        if (maxChars < 4) {
            throw new IllegalArgumentException("Limit must be at least 4");
        }
        this.maxChars = maxChars;
    }

    @Override
    public final String render(String topic) {
        if (topic == null || topic.isBlank()) {
            throw new IllegalArgumentException("Topic is required");
        }
        String text = topic.strip();
        return text.length() <= maxChars ? text : shorten(text, maxChars);
    }

    // Called only with stripped, nonblank text longer than maxChars.
    // Subclasses must return a nonblank result no longer than maxChars.
    protected abstract String shorten(String text, int maxChars);
}
