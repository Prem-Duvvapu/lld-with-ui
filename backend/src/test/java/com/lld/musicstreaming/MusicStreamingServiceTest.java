package com.lld.musicstreaming;

import com.lld.musicstreaming.exception.ConcurrentStreamLimitExceededException;
import com.lld.musicstreaming.exception.DownloadNotAllowedException;
import com.lld.musicstreaming.exception.InvalidPlaylistOperationException;
import com.lld.musicstreaming.exception.PlaylistNotFoundException;
import com.lld.musicstreaming.exception.SkipLimitExceededException;
import com.lld.musicstreaming.exception.SongNotFoundException;
import com.lld.musicstreaming.exception.UserNotFoundException;
import com.lld.musicstreaming.model.PlaybackSession;
import com.lld.musicstreaming.model.Playlist;
import com.lld.musicstreaming.model.Song;
import com.lld.musicstreaming.model.SubscriptionPlan;
import com.lld.musicstreaming.model.User;
import com.lld.musicstreaming.observer.ListeningHistoryListener;
import com.lld.musicstreaming.observer.PlayCountListener;
import com.lld.musicstreaming.repository.MusicStreamingRepository;
import com.lld.musicstreaming.service.MusicStreamingService;
import com.lld.musicstreaming.service.PlaybackService;
import com.lld.musicstreaming.service.RecommendationService;
import com.lld.musicstreaming.strategy.SubscriptionStrategyFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Music Streaming Service — Facade Behaviour")
class MusicStreamingServiceTest {

    private MusicStreamingService service;

    @BeforeEach
    void setUp() {
        MusicStreamingRepository repository = new MusicStreamingRepository();
        PlaybackService playbackService = new PlaybackService(List.of(new ListeningHistoryListener(), new PlayCountListener()));
        RecommendationService recommendationService = new RecommendationService();
        SubscriptionStrategyFactory strategyFactory = new SubscriptionStrategyFactory();
        service = new MusicStreamingService(repository, playbackService, recommendationService, strategyFactory);
    }

    // ---- Catalog ----

    @Test
    @DisplayName("getSong throws SongNotFoundException for an unknown id")
    void getSongThrowsForUnknown() {
        assertThrows(SongNotFoundException.class, () -> service.getSong("NO-SUCH-SONG"));
    }

    @Test
    @DisplayName("search matches songs by title and artist, case-insensitively")
    void searchMatchesByTitleAndArtist() {
        Map<String, Object> byTitle = service.search("blinding");
        @SuppressWarnings("unchecked")
        List<Song> songs = (List<Song>) byTitle.get("songs");
        assertTrue(songs.stream().anyMatch(s -> s.getTitle().equals("Blinding Lights")));

        Map<String, Object> byArtist = service.search("weeknd");
        @SuppressWarnings("unchecked")
        List<Song> byArtistSongs = (List<Song>) byArtist.get("songs");
        assertFalse(byArtistSongs.isEmpty());
    }

    // ---- Users & Subscription ----

    @Test
    @DisplayName("getUser throws UserNotFoundException for an unknown id")
    void getUserThrowsForUnknown() {
        assertThrows(UserNotFoundException.class, () -> service.getUser("NO-SUCH-USER"));
    }

    @Test
    @DisplayName("changeSubscription updates the plan and resets the hourly skip counter")
    void changeSubscriptionResetsSkipCounter() {
        // Burn a couple of skips on the FREE user first.
        PlaybackSession session = service.startPlayback("U-1", "S-1", "device-1");
        service.skipPlayback(session.getId());
        service.skipPlayback(session.getId());
        assertEquals(2, service.getUser("U-1").getSkipsUsedThisHour());

        User updated = service.changeSubscription("U-1", SubscriptionPlan.PREMIUM);

        assertEquals(SubscriptionPlan.PREMIUM, updated.getSubscription().getPlan());
        assertEquals(0, updated.getSkipsUsedThisHour(), "switching plans must not carry over old usage");
    }

    // ---- Playlists ----

    @Test
    @DisplayName("createPlaylist attaches the new playlist to the owner")
    void createPlaylistAttachesToOwner() {
        Playlist playlist = service.createPlaylist("U-1", "Road Trip");

        assertEquals("U-1", playlist.getOwnerId());
        assertTrue(service.getUser("U-1").getPlaylistIds().contains(playlist.getId()));
    }

    @Test
    @DisplayName("createPlaylist rejects a blank name")
    void createPlaylistRejectsBlankName() {
        assertThrows(InvalidPlaylistOperationException.class, () -> service.createPlaylist("U-1", "  "));
    }

    @Test
    @DisplayName("addSongToPlaylist is idempotent — adding the same song twice doesn't duplicate it")
    void addSongToPlaylistIsIdempotent() {
        Playlist playlist = service.createPlaylist("U-1", "Favorites");
        service.addSongToPlaylist(playlist.getId(), "S-1");
        service.addSongToPlaylist(playlist.getId(), "S-1");

        assertEquals(1, service.getPlaylist(playlist.getId()).getSongIds().size());
    }

    @Test
    @DisplayName("removeSongFromPlaylist throws when the song isn't in the playlist")
    void removeSongFromPlaylistThrowsWhenAbsent() {
        Playlist playlist = service.createPlaylist("U-1", "Empty");
        assertThrows(InvalidPlaylistOperationException.class,
                () -> service.removeSongFromPlaylist(playlist.getId(), "S-1"));
    }

    @Test
    @DisplayName("reorderPlaylist moves a song to the requested position")
    void reorderPlaylistMovesSong() {
        Playlist playlist = service.createPlaylist("U-1", "Order Test");
        service.addSongToPlaylist(playlist.getId(), "S-1");
        service.addSongToPlaylist(playlist.getId(), "S-2");
        service.addSongToPlaylist(playlist.getId(), "S-3");

        Playlist reordered = service.reorderPlaylist(playlist.getId(), "S-1", 2);

        assertEquals(List.of("S-2", "S-3", "S-1"), reordered.getSongIds());
    }

    @Test
    @DisplayName("reorderPlaylist clamps an out-of-range position instead of throwing")
    void reorderPlaylistClampsPosition() {
        Playlist playlist = service.createPlaylist("U-1", "Clamp Test");
        service.addSongToPlaylist(playlist.getId(), "S-1");
        service.addSongToPlaylist(playlist.getId(), "S-2");

        Playlist reordered = service.reorderPlaylist(playlist.getId(), "S-1", 999);

        assertEquals(List.of("S-2", "S-1"), reordered.getSongIds());
    }

    @Test
    @DisplayName("getPlaylist throws PlaylistNotFoundException for an unknown id")
    void getPlaylistThrowsForUnknown() {
        assertThrows(PlaylistNotFoundException.class, () -> service.getPlaylist("NO-SUCH-PLAYLIST"));
    }

    // ---- Liked songs & downloads ----

    @Test
    @DisplayName("likeSong then unlikeSong round-trips cleanly")
    void likeAndUnlikeRoundTrip() {
        service.likeSong("U-1", "S-2");
        assertTrue(service.getUser("U-1").getLikedSongIds().contains("S-2"));

        service.unlikeSong("U-1", "S-2");
        assertFalse(service.getUser("U-1").getLikedSongIds().contains("S-2"));
    }

    @Test
    @DisplayName("FREE user cannot download — DownloadNotAllowedException")
    void freeUserCannotDownload() {
        assertEquals(SubscriptionPlan.FREE, service.getUser("U-1").getSubscription().getPlan());
        assertThrows(DownloadNotAllowedException.class, () -> service.downloadSong("U-1", "S-1"));
    }

    @Test
    @DisplayName("PREMIUM user can download and it lands in their offline library")
    void premiumUserCanDownload() {
        assertEquals(SubscriptionPlan.PREMIUM, service.getUser("U-2").getSubscription().getPlan());
        User updated = service.downloadSong("U-2", "S-9");
        assertTrue(updated.getDownloadedSongIds().contains("S-9"));
    }

    // ---- Playback ----

    @Test
    @DisplayName("startPlayback records a listen event via the Observer and bumps the song's play count")
    void startPlaybackNotifiesObservers() {
        Song before = service.getSong("S-1");
        long playsBefore = before.getPlayCount();

        service.startPlayback("U-2", "S-1", "device-1");

        assertEquals(playsBefore + 1, service.getSong("S-1").getPlayCount());
        assertFalse(service.getUser("U-2").getListeningHistory().isEmpty());
    }

    @Test
    @DisplayName("startPlayback beyond the plan's concurrent-stream limit is refused")
    void startPlaybackBeyondLimitIsRefused() {
        // U-1 is FREE: limit 1.
        service.startPlayback("U-1", "S-1", "device-1");
        assertThrows(ConcurrentStreamLimitExceededException.class,
                () -> service.startPlayback("U-1", "S-2", "device-2"));
    }

    @Test
    @DisplayName("stopPlayback frees the slot so a new stream can start")
    void stopPlaybackFreesSlot() {
        PlaybackSession session = service.startPlayback("U-1", "S-1", "device-1");
        service.stopPlayback(session.getId());

        assertDoesNotThrow(() -> service.startPlayback("U-1", "S-2", "device-2"));
    }

    @Test
    @DisplayName("FREE user is refused a 7th skip in the same hour")
    void freeUserSkipLimitEnforced() {
        PlaybackSession session = service.startPlayback("U-1", "S-1", "device-1");
        for (int i = 0; i < 6; i++) {
            service.skipPlayback(session.getId());
        }
        assertThrows(SkipLimitExceededException.class, () -> service.skipPlayback(session.getId()));
    }

    @Test
    @DisplayName("PREMIUM user has unlimited skips")
    void premiumUserUnlimitedSkips() {
        PlaybackSession session = service.startPlayback("U-2", "S-1", "device-1");
        assertDoesNotThrow(() -> {
            for (int i = 0; i < 20; i++) {
                service.skipPlayback(session.getId());
            }
        });
    }

    @Test
    @DisplayName("getActiveSessionsForUser only reflects that user's active sessions")
    void getActiveSessionsForUserIsScoped() {
        PlaybackSession session = service.startPlayback("U-3", "S-1", "device-1");

        assertEquals(1, service.getActiveSessionsForUser("U-3").size());
        assertEquals(session.getId(), service.getActiveSessionsForUser("U-3").get(0).getId());
        assertTrue(service.getActiveSessionsForUser("U-1").isEmpty());
    }

    // ---- Recommendations ----

    @Test
    @DisplayName("getRecommendations returns songs, respecting the requested limit")
    void getRecommendationsRespectsLimit() {
        List<Song> recs = service.getRecommendations("U-1", 3);
        assertEquals(3, recs.size());
    }

    // ---- Simulation sandbox isolation ----

    @Test
    @DisplayName("sim endpoints never mutate live state")
    void simEndpointsDoNotTouchLiveState() {
        service.simPlay("U-1", "S-1", "sim-device");

        assertTrue(service.getActiveSessionsForUser("U-1").isEmpty(),
                "the sandbox must not leak sessions into live state");
    }
}
