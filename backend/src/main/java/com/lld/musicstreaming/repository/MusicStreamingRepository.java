package com.lld.musicstreaming.repository;

import com.lld.musicstreaming.model.Album;
import com.lld.musicstreaming.model.Artist;
import com.lld.musicstreaming.model.Genre;
import com.lld.musicstreaming.model.PlaybackSession;
import com.lld.musicstreaming.model.Playlist;
import com.lld.musicstreaming.model.Song;
import com.lld.musicstreaming.model.Subscription;
import com.lld.musicstreaming.model.SubscriptionPlan;
import com.lld.musicstreaming.model.User;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicLong;

@Repository
public class MusicStreamingRepository {

    private final ConcurrentMap<String, Artist> artists = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Album> albums = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Song> songs = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Playlist> playlists = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, User> users = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, PlaybackSession> sessions = new ConcurrentHashMap<>();

    private final AtomicLong playlistSeq = new AtomicLong(0);
    private final AtomicLong sessionSeq = new AtomicLong(0);

    public MusicStreamingRepository() {
        seed();
    }

    public void seed() {
        artists.clear();
        albums.clear();
        songs.clear();
        playlists.clear();
        users.clear();
        sessions.clear();
        playlistSeq.set(0);
        sessionSeq.set(0);

        Artist weeknd = saveArtist(Artist.builder().id("ART-1").name("The Weeknd").bio("Canadian singer-songwriter").monthlyListeners(95_000_000).build());
        Artist dua = saveArtist(Artist.builder().id("ART-2").name("Dua Lipa").bio("English-Albanian pop star").monthlyListeners(78_000_000).build());
        Artist mozart = saveArtist(Artist.builder().id("ART-3").name("Wolfgang Amadeus Mozart").bio("Classical composer").monthlyListeners(12_000_000).build());
        Artist kendrick = saveArtist(Artist.builder().id("ART-4").name("Kendrick Lamar").bio("American rapper").monthlyListeners(56_000_000).build());

        Album afterHours = saveAlbum(Album.builder().id("ALB-1").title("After Hours").artistId(weeknd.getId()).artistName(weeknd.getName()).releaseYear(2020).coverArt("🌃").build());
        Album futureNostalgia = saveAlbum(Album.builder().id("ALB-2").title("Future Nostalgia").artistId(dua.getId()).artistName(dua.getName()).releaseYear(2020).coverArt("💿").build());
        Album symphony40 = saveAlbum(Album.builder().id("ALB-3").title("Symphony No. 40").artistId(mozart.getId()).artistName(mozart.getName()).releaseYear(1788).coverArt("🎻").build());
        Album damn = saveAlbum(Album.builder().id("ALB-4").title("DAMN.").artistId(kendrick.getId()).artistName(kendrick.getName()).releaseYear(2017).coverArt("🩸").build());

        saveSong(song("S-1", "Blinding Lights", weeknd, afterHours, Genre.POP, 200, 1));
        saveSong(song("S-2", "Save Your Tears", weeknd, afterHours, Genre.POP, 215, 2));
        saveSong(song("S-3", "In Your Eyes", weeknd, afterHours, Genre.POP, 237, 3));
        saveSong(song("S-4", "Levitating", dua, futureNostalgia, Genre.POP, 203, 1));
        saveSong(song("S-5", "Don't Start Now", dua, futureNostalgia, Genre.POP, 183, 2));
        saveSong(song("S-6", "Physical", dua, futureNostalgia, Genre.ELECTRONIC, 194, 3));
        saveSong(song("S-7", "Allegro", mozart, symphony40, Genre.CLASSICAL, 480, 1));
        saveSong(song("S-8", "Andante", mozart, symphony40, Genre.CLASSICAL, 360, 2));
        saveSong(song("S-9", "HUMBLE.", kendrick, damn, Genre.HIP_HOP, 177, 1));
        saveSong(song("S-10", "DNA.", kendrick, damn, Genre.HIP_HOP, 185, 2));

        User alice = saveUser(User.builder().id("U-1").name("Alice").email("alice@example.com")
                .subscription(Subscription.builder().plan(SubscriptionPlan.FREE).build())
                .build());
        User bob = saveUser(User.builder().id("U-2").name("Bob").email("bob@example.com")
                .subscription(Subscription.builder().plan(SubscriptionPlan.PREMIUM).build())
                .build());
        User carol = saveUser(User.builder().id("U-3").name("Carol").email("carol@example.com")
                .subscription(Subscription.builder().plan(SubscriptionPlan.FAMILY).build())
                .build());

        Playlist chill = savePlaylist(Playlist.builder().id(generatePlaylistId()).name("Chill Vibes").ownerId(alice.getId())
                .songIds(new ArrayList<>(List.of("S-1", "S-4"))).isPublic(true).build());
        alice.getPlaylistIds().add(chill.getId());
        saveUser(alice);

        Playlist workout = savePlaylist(Playlist.builder().id(generatePlaylistId()).name("Workout Mix").ownerId(bob.getId())
                .songIds(new ArrayList<>(List.of("S-9", "S-10", "S-6"))).isPublic(false).build());
        bob.getPlaylistIds().add(workout.getId());
        saveUser(bob);
    }

    private static Song song(String id, String title, Artist artist, Album album, Genre genre, int duration, int track) {
        return Song.builder()
                .id(id).title(title)
                .artistId(artist.getId()).artistName(artist.getName())
                .albumId(album.getId()).albumTitle(album.getTitle())
                .genre(genre).duration(duration)
                .audioUrl("https://stream.lld.local/audio/" + id + ".mp3")
                .trackNumber(track)
                .playCount(0)
                .build();
    }

    public String generatePlaylistId() {
        return String.format("PL-%05d", playlistSeq.incrementAndGet());
    }

    public String generateSessionId() {
        return String.format("SESSION-%05d", sessionSeq.incrementAndGet());
    }

    // Artists
    public List<Artist> findAllArtists() {
        List<Artist> list = new ArrayList<>(artists.values());
        list.sort(Comparator.comparing(Artist::getId));
        return list;
    }

    public Optional<Artist> findArtistById(String id) {
        return Optional.ofNullable(artists.get(id));
    }

    public Artist saveArtist(Artist artist) {
        artists.put(artist.getId(), artist);
        return artist;
    }

    // Albums
    public List<Album> findAllAlbums() {
        List<Album> list = new ArrayList<>(albums.values());
        list.sort(Comparator.comparing(Album::getId));
        return list;
    }

    public Optional<Album> findAlbumById(String id) {
        return Optional.ofNullable(albums.get(id));
    }

    public Album saveAlbum(Album album) {
        albums.put(album.getId(), album);
        return album;
    }

    // Songs
    public List<Song> findAllSongs() {
        List<Song> list = new ArrayList<>(songs.values());
        list.sort(Comparator.comparing(Song::getId));
        return list;
    }

    public Optional<Song> findSongById(String id) {
        return Optional.ofNullable(songs.get(id));
    }

    public Song saveSong(Song song) {
        songs.put(song.getId(), song);
        return song;
    }

    // Playlists
    public List<Playlist> findAllPlaylists() {
        List<Playlist> list = new ArrayList<>(playlists.values());
        list.sort(Comparator.comparing(Playlist::getId));
        return list;
    }

    public Optional<Playlist> findPlaylistById(String id) {
        return Optional.ofNullable(playlists.get(id));
    }

    public Playlist savePlaylist(Playlist playlist) {
        playlists.put(playlist.getId(), playlist);
        return playlist;
    }

    // Users
    public List<User> findAllUsers() {
        List<User> list = new ArrayList<>(users.values());
        list.sort(Comparator.comparing(User::getId));
        return list;
    }

    public Optional<User> findUserById(String id) {
        return Optional.ofNullable(users.get(id));
    }

    public User saveUser(User user) {
        users.put(user.getId(), user);
        return user;
    }

    // Playback Sessions
    public List<PlaybackSession> findAllSessions() {
        List<PlaybackSession> list = new ArrayList<>(sessions.values());
        list.sort(Comparator.comparing(PlaybackSession::getId));
        return list;
    }

    public Optional<PlaybackSession> findSessionById(String id) {
        return Optional.ofNullable(sessions.get(id));
    }

    public PlaybackSession saveSession(PlaybackSession session) {
        sessions.put(session.getId(), session);
        return session;
    }

    /** Count of active sessions for a user — the value {@code PlaybackService} guards with a lock. */
    public long countActiveSessionsForUser(String userId) {
        return sessions.values().stream()
                .filter(s -> s.isActive() && userId.equals(s.getUserId()))
                .count();
    }

    public List<PlaybackSession> findActiveSessionsForUser(String userId) {
        List<PlaybackSession> list = new ArrayList<>();
        for (PlaybackSession s : sessions.values()) {
            if (s.isActive() && userId.equals(s.getUserId())) {
                list.add(s);
            }
        }
        list.sort(Comparator.comparing(PlaybackSession::getId));
        return list;
    }
}
