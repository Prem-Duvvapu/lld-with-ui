package com.lld.learning.examples;

/** A compact label for a study topic, measured in Java String.length() units. */
public interface TopicLabel {
    /**
     * Reject null or blank input with IllegalArgumentException.
     * Strip surrounding whitespace; return that text unchanged if it fits.
     * Otherwise return a nonblank label within the configured character limit.
     */
    String render(String topic);
}
