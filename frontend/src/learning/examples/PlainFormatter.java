package com.lld.learning.examples;

public final class PlainFormatter implements MessageFormatter {
    @Override
    public String format(String text) {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("Text is required");
        }
        return text.trim();
    }
}
