package com.lld.learning.examples;

public interface MessageFormatter {
    /**
     * Format non-null, nonblank text without changing the caller's input.
     * Reject null or blank text with IllegalArgumentException.
     */
    String format(String text);
}
