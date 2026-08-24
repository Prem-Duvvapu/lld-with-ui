package com.lld.musicstreaming.observer;

import com.lld.musicstreaming.model.Song;
import com.lld.musicstreaming.model.User;
import com.lld.musicstreaming.repository.MusicStreamingRepository;

/**
 * Observer notified whenever {@code PlaybackService} starts a stream. Every listener
 * that starts listening ({@code @Component}) is picked up by Spring and invoked without
 * {@code PlaybackService} knowing what any of them do — new side effects (history,
 * recommendations, analytics) plug in without touching the playback code path.
 */
public interface PlaybackEventListener {
    void onStreamStarted(MusicStreamingRepository repository, User user, Song song);
}
