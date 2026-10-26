package com.lld.learning.examples.inheritance;

import java.util.List;

/** A video is a resource that also has a positive duration. */
public final class InheritanceVideo extends InheritanceResource {
    private final int minutes;

    public InheritanceVideo(String title, int minutes, List<String> trace) {
        super(title, trace);
        if (minutes <= 0) {
            throw new IllegalArgumentException("Minutes must be positive");
        }
        this.minutes = minutes;
        trace.add("video initialized: " + minutes + " min");
    }

    public int getMinutes() {
        return minutes;
    }

    @Override
    public String describe() {
        return super.describe() + " (video, " + minutes + " min)";
    }
}
