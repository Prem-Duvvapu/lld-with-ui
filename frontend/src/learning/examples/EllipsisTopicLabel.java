package com.lld.learning.examples;

public final class EllipsisTopicLabel extends BoundedTopicLabel {
    public EllipsisTopicLabel(int maxChars) {
        super(maxChars);
    }

    @Override
    protected String shorten(String text, int maxChars) {
        return text.substring(0, maxChars - 3) + "...";
    }
}
