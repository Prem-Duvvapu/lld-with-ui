package com.lld.learning.examples;

public final class ClippedTopicLabel extends BoundedTopicLabel {
    public ClippedTopicLabel(int maxChars) {
        super(maxChars);
    }

    @Override
    protected String shorten(String text, int maxChars) {
        return text.substring(0, maxChars);
    }
}
