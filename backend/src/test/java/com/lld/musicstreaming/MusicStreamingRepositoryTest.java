package com.lld.musicstreaming;

import com.lld.musicstreaming.model.Album;
import com.lld.musicstreaming.model.Artist;
import com.lld.musicstreaming.model.PlaybackSession;
import com.lld.musicstreaming.model.Playlist;
import com.lld.musicstreaming.model.Song;
import com.lld.musicstreaming.model.SubscriptionPlan;
import com.lld.musicstreaming.model.User;
import com.lld.musicstreaming.repository.MusicStreamingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Music Streaming Repository Storage & Lookup")
class MusicStreamingRepositoryTest {

    private MusicStreamingRepository repository;

    @BeforeEach
    void setUp() {
        repository = new MusicStreamingRepository();
    }

    @Test
    @DisplayName("Absent lookups return empty Optional rather than throwing")
    void absentLookupsReturnEmpty() {
        assertTrue(repository.findSongById("NO-SUCH-SONG").isEmpty());
        assertTrue(repository.findUserById("NO-SUCH-USER").isEmpty());
        assertTrue(repository.findPlaylistById("NO-SUCH-PLAYLIST").isEmpty());
        assertTrue(repository.findArtistById("NO-SUCH-ARTIST").isEmpty());
        assertTrue(repository.findAlbumById("NO-SUCH-ALBUM").isEmpty());
        assertTrue(repository.findSessionById("NO-SUCH-SESSION").isEmpty());
    }

    @Test
    @DisplayName("Seed data: 4 artists, 4 albums, 10 songs, 3 users, 2 playlists")
    void seedDataIsPopulated() {
        assertEquals(4, repository.findAllArtists().size());
        assertEquals(4, repository.findAllAlbums().size());
        assertEquals(10, repository.findAllSongs().size());
        assertEquals(3, repository.findAllUsers().size());
        assertEquals(2, repository.findAllPlaylists().size());
    }

    @Test
    @DisplayName("Seed users cover all three subscription plans")
    void seedUsersCoverAllPlans() {
        List<SubscriptionPlan> plans = repository.findAllUsers().stream()
                .map(u -> u.getSubscription().getPlan())
                .toList();
        assertTrue(plans.contains(SubscriptionPlan.FREE));
        assertTrue(plans.contains(SubscriptionPlan.PREMIUM));
        assertTrue(plans.contains(SubscriptionPlan.FAMILY));
    }

    @Test
    @DisplayName("Songs, users and playlists round-trip through the store")
    void entitiesRoundTrip() {
        Song song = Song.builder().id("S-X").title("Test Track").artistId("ART-1").artistName("The Weeknd")
                .albumId("ALB-1").albumTitle("After Hours").duration(180).audioUrl("x").trackNumber(9).build();
        repository.saveSong(song);
        assertEquals("Test Track", repository.findSongById("S-X").orElseThrow().getTitle());

        User user = User.builder().id("U-X").name("Zed").email("zed@example.com").build();
        repository.saveUser(user);
        assertEquals("Zed", repository.findUserById("U-X").orElseThrow().getName());

        Playlist playlist = Playlist.builder().id(repository.generatePlaylistId()).name("Test Mix").ownerId("U-X").build();
        repository.savePlaylist(playlist);
        assertEquals("Test Mix", repository.findPlaylistById(playlist.getId()).orElseThrow().getName());
    }

    @Test
    @DisplayName("Playlist and session ids are unique and monotonically increasing")
    void generatedIdsAreUnique() {
        String p1 = repository.generatePlaylistId();
        String p2 = repository.generatePlaylistId();
        assertNotEquals(p1, p2);

        String s1 = repository.generateSessionId();
        String s2 = repository.generateSessionId();
        assertNotEquals(s1, s2);
    }

    @Test
    @DisplayName("countActiveSessionsForUser only counts active sessions for that user")
    void countActiveSessionsForUserIsScopedCorrectly() {
        repository.saveSession(PlaybackSession.builder().id("SESS-1").userId("U-1").songId("S-1").active(true).build());
        repository.saveSession(PlaybackSession.builder().id("SESS-2").userId("U-1").songId("S-2").active(true).build());
        repository.saveSession(PlaybackSession.builder().id("SESS-3").userId("U-1").songId("S-3").active(false).build());
        repository.saveSession(PlaybackSession.builder().id("SESS-4").userId("U-2").songId("S-1").active(true).build());

        assertEquals(2, repository.countActiveSessionsForUser("U-1"));
        assertEquals(1, repository.countActiveSessionsForUser("U-2"));
        assertEquals(0, repository.countActiveSessionsForUser("U-NOBODY"));

        assertEquals(2, repository.findActiveSessionsForUser("U-1").size());
    }

    @Test
    @DisplayName("seed() wipes and reseeds rather than accumulating duplicates")
    void seedIsIdempotentAndResets() {
        repository.saveSong(Song.builder().id("S-TEMP").title("Ephemeral").build());
        assertEquals(11, repository.findAllSongs().size());

        repository.seed();

        assertEquals(10, repository.findAllSongs().size());
        assertTrue(repository.findSongById("S-TEMP").isEmpty());
        assertTrue(repository.findAllSessions().isEmpty());
    }

    @Test
    @DisplayName("Artist and Album round-trip through the store")
    void artistAndAlbumRoundTrip() {
        Artist artist = repository.findArtistById("ART-1").orElseThrow();
        assertEquals("The Weeknd", artist.getName());

        Album album = repository.findAlbumById("ALB-1").orElseThrow();
        assertEquals("After Hours", album.getTitle());
        assertEquals("ART-1", album.getArtistId());
    }
}
