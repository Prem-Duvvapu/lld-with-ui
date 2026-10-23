package com.lld.learning.examples;

public final class TaggedFormatter implements MessageFormatter {
    private final String tag;

    public TaggedFormatter(String tag) {
        if (tag == null || tag.isBlank()) {
            throw new IllegalArgumentException("Tag is required");
        }
        this.tag = tag.trim();
    }

    @Override
    public String format(String text) {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("Text is required");
        }
        return "[" + tag + "] " + text.trim();
    }

    public String getTag() {
        return tag;
    }
}
