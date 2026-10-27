package com.lld.learning.examples.aggregation;

import java.util.ArrayList;
import java.util.List;

/** Single-threaded domain model: deletion ends a playlist, never its catalog tracks. */
public final class Playlist {
    private final String name;
    private final List<Track> tracks = new ArrayList<>();
    private boolean deleted;

    public Playlist(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Playlist name is required");
        }
        this.name = name.trim();
    }

    public String getName() { return name; }
    public boolean isDeleted() { return deleted; }

    // A detached membership list; its elements are still the same mutable Track objects.
    public List<Track> getTracks() { return List.copyOf(tracks); }

    public void add(Track track) {
        requireActive();
        requireTrack(track);
        // Track has Object's equality: duplicate means the very same instance here.
        if (tracks.contains(track)) {
            throw new IllegalArgumentException("Track already in playlist");
        }
        tracks.add(track);
    }

    public boolean remove(Track track) {
        requireActive();
        requireTrack(track);
        return tracks.remove(track);
    }

    public void delete() {
        if (deleted) return;
        tracks.clear();
        deleted = true;
    }

    private void requireActive() {
        if (deleted) throw new IllegalStateException("Playlist is deleted");
    }

    private static void requireTrack(Track track) {
        if (track == null) throw new IllegalArgumentException("Track is required");
    }
}
