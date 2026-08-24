package com.lld.musicstreaming.observer;

import com.lld.musicstreaming.model.Song;
import com.lld.musicstreaming.model.User;
import com.lld.musicstreaming.repository.MusicStreamingRepository;
import org.springframework.stereotype.Component;

/** Bumps the song's global play count — the signal {@code RecommendationService}'s trending fallback reads. */
@Component
public class PlayCountListener implements PlaybackEventListener {

    @Override
    public void onStreamStarted(MusicStreamingRepository repository, User user, Song song) {
        song.setPlayCount(song.getPlayCount() + 1);
        repository.saveSong(song);
    }
}
