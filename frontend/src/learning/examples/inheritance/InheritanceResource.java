package com.lld.learning.examples.inheritance;

import java.util.List;

/** A resource has a nonblank title and describes itself with that title. */
public class InheritanceResource {
    private final String title;

    public InheritanceResource(String title, List<String> trace) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Title is required");
        }
        this.title = title.trim();
        // Teaching trace only: never call overridable describe() here.
        trace.add("resource initialized: " + this.title);
    }

    public final String getTitle() {
        return title;
    }

    public String describe() {
        return "Resource: " + title;
    }
}
