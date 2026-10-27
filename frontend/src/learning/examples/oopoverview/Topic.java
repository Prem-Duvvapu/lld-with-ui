package com.lld.learning.examples.oopoverview;

/** An independently managed catalog topic; plans may share its identity. */
public final class Topic {
    private String title;

    public Topic(String title) {
        rename(title);
    }

    public String title() {
        return title;
    }

    public void rename(String title) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Topic title is required");
        }
        this.title = title.strip();
    }
}
