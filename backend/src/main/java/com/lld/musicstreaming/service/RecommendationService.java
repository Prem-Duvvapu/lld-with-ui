package com.lld.musicstreaming.service;

import com.lld.musicstreaming.model.Genre;
import com.lld.musicstreaming.model.Song;
import com.lld.musicstreaming.model.User;
import com.lld.musicstreaming.repository.MusicStreamingRepository;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Genre-affinity recommendations: build the set of genres the user already listens to
 * (liked songs + recent history), then rank unheard songs in those genres by play count.
 * Falls back to global top plays for a brand-new user with no signal yet.
 */
@Service
public class RecommendationService {

    public List<Song> recommendFor(MusicStreamingRepository repo, User user, int limit) {
        Set<String> excluded = new java.util.HashSet<>(user.getLikedSongIds());
        user.getListeningHistory().forEach(e -> excluded.add(e.getSongId()));

        Set<Genre> affinity = EnumSet.noneOf(Genre.class);
        for (String songId : user.getLikedSongIds()) {
            repo.findSongById(songId).ifPresent(s -> affinity.add(s.getGenre()));
        }
        user.getListeningHistory().forEach(e -> {
            if (e.getGenre() != null) affinity.add(e.getGenre());
        });

        List<Song> candidates = repo.findAllSongs().stream()
                .filter(s -> !excluded.contains(s.getId()))
                .collect(Collectors.toList());

        List<Song> affinityMatches = candidates.stream()
                .filter(s -> affinity.contains(s.getGenre()))
                .sorted(Comparator.comparingLong(Song::getPlayCount).reversed())
                .collect(Collectors.toList());

        if (affinityMatches.size() >= limit || !affinity.isEmpty()) {
            if (affinityMatches.size() >= limit) {
                return affinityMatches.subList(0, limit);
            }
            // Not enough affinity matches: fill the rest with global top plays, no duplicates.
            List<Song> filler = candidates.stream()
                    .filter(s -> !affinityMatches.contains(s))
                    .sorted(Comparator.comparingLong(Song::getPlayCount).reversed())
                    .collect(Collectors.toList());
            List<Song> combined = new java.util.ArrayList<>(affinityMatches);
            for (Song s : filler) {
                if (combined.size() >= limit) break;
                combined.add(s);
            }
            return combined;
        }

        return candidates.stream()
                .sorted(Comparator.comparingLong(Song::getPlayCount).reversed())
                .limit(limit)
                .collect(Collectors.toList());
    }
}
