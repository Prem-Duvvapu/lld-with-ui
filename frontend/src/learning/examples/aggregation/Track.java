package com.lld.learning.examples.aggregation;

/** A catalog track can be a part of several playlists in this domain. */
public final class Track {
    private String title;

    public Track(String title) {
        rename(title);
    }

    public String getTitle() { return title; }

    public void rename(String title) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Track title is required");
        }
        this.title = title.trim();
    }
}
