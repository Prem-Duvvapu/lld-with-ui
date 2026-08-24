package com.lld.musicstreaming.observer;

import com.lld.musicstreaming.model.ListenEvent;
import com.lld.musicstreaming.model.Song;
import com.lld.musicstreaming.model.User;
import com.lld.musicstreaming.repository.MusicStreamingRepository;
import org.springframework.stereotype.Component;

/** Appends a {@link ListenEvent} to the user's history — the signal {@code RecommendationService} reads. */
@Component
public class ListeningHistoryListener implements PlaybackEventListener {

    @Override
    public void onStreamStarted(MusicStreamingRepository repository, User user, Song song) {
        user.getListeningHistory().add(ListenEvent.builder().songId(song.getId()).genre(song.getGenre()).build());
        repository.saveUser(user);
    }
}
