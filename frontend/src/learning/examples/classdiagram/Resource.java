package com.lld.learning.examples.classdiagram;

import java.util.Objects;

public abstract class Resource {
    private final String title;

    protected Resource(String title) {
        this.title = Objects.requireNonNull(title, "Title is required");
        if (title.isBlank()) throw new IllegalArgumentException("Title must not be blank");
    }

    public final String title() { return title; }
    public abstract String label();
}
