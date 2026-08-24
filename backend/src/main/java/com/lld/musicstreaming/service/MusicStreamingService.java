package com.lld.musicstreaming.service;

import com.lld.musicstreaming.exception.DownloadNotAllowedException;
import com.lld.musicstreaming.exception.InvalidPlaylistOperationException;
import com.lld.musicstreaming.exception.PlaylistNotFoundException;
import com.lld.musicstreaming.exception.SongNotFoundException;
import com.lld.musicstreaming.exception.UserNotFoundException;
import com.lld.musicstreaming.model.Album;
import com.lld.musicstreaming.model.Artist;
import com.lld.musicstreaming.model.MusicStreamingEvent;
import com.lld.musicstreaming.model.PlaybackSession;
import com.lld.musicstreaming.model.Playlist;
import com.lld.musicstreaming.model.Song;
import com.lld.musicstreaming.model.SubscriptionPlan;
import com.lld.musicstreaming.model.User;
import com.lld.musicstreaming.repository.MusicStreamingRepository;
import com.lld.musicstreaming.strategy.SubscriptionStrategy;
import com.lld.musicstreaming.strategy.SubscriptionStrategyFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
public class MusicStreamingService {

    private final MusicStreamingRepository repository;
    private final PlaybackService playbackService;
    private final RecommendationService recommendationService;
    private final SubscriptionStrategyFactory strategyFactory;

    // Isolated Simulation Sandbox State — never touched by the live endpoints above.
    private final MusicStreamingRepository simRepository = new MusicStreamingRepository();
    private final List<MusicStreamingEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventSeq = new AtomicLong(0);

    public MusicStreamingService(MusicStreamingRepository repository,
                                  PlaybackService playbackService,
                                  RecommendationService recommendationService,
                                  SubscriptionStrategyFactory strategyFactory) {
        this.repository = repository;
        this.playbackService = playbackService;
        this.recommendationService = recommendationService;
        this.strategyFactory = strategyFactory;
    }

    // ==========================================
    // Catalog
    // ==========================================

    public List<Song> getSongs() {
        return repository.findAllSongs();
    }

    public Song getSong(String songId) {
        return repository.findSongById(songId)
                .orElseThrow(() -> new SongNotFoundException("Song not found: " + songId));
    }

    public List<Artist> getArtists() {
        return repository.findAllArtists();
    }

    public List<Album> getAlbums() {
        return repository.findAllAlbums();
    }

    public Map<String, Object> search(String query) {
        String q = query == null ? "" : query.toLowerCase();
        List<Song> songMatches = repository.findAllSongs().stream()
                .filter(s -> s.getTitle().toLowerCase().contains(q) || s.getArtistName().toLowerCase().contains(q))
                .collect(Collectors.toList());
        List<Artist> artistMatches = repository.findAllArtists().stream()
                .filter(a -> a.getName().toLowerCase().contains(q))
                .collect(Collectors.toList());
        List<Album> albumMatches = repository.findAllAlbums().stream()
                .filter(a -> a.getTitle().toLowerCase().contains(q))
                .collect(Collectors.toList());
        List<Playlist> playlistMatches = repository.findAllPlaylists().stream()
                .filter(p -> p.isPublic() && p.getName().toLowerCase().contains(q))
                .collect(Collectors.toList());

        return Map.of(
                "songs", songMatches,
                "artists", artistMatches,
                "albums", albumMatches,
                "playlists", playlistMatches
        );
    }

    // ==========================================
    // Users
    // ==========================================

    public List<User> getUsers() {
        return repository.findAllUsers();
    }

    public User getUser(String userId) {
        return repository.findUserById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));
    }

    public User changeSubscription(String userId, SubscriptionPlan plan) {
        return changeSubscriptionIn(repository, userId, plan);
    }

    /** Shared plan-change logic for both the live and sim paths — see {@link #createPlaylistIn}. */
    private User changeSubscriptionIn(MusicStreamingRepository repo, String userId, SubscriptionPlan plan) {
        User user = repo.findUserById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));
        user.getSubscription().setPlan(plan);
        // A tier change resets the hourly skip counter — the old plan's usage shouldn't
        // carry over and immediately lock the user out of the new plan's allowance.
        user.setSkipsUsedThisHour(0);
        return repo.saveUser(user);
    }

    // ==========================================
    // Playlists
    // ==========================================

    public List<Playlist> getPlaylistsForUser(String userId) {
        return repository.findAllPlaylists().stream()
                .filter(p -> p.getOwnerId().equals(userId))
                .collect(Collectors.toList());
    }

    public Playlist getPlaylist(String playlistId) {
        return repository.findPlaylistById(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException("Playlist not found: " + playlistId));
    }

    public Playlist createPlaylist(String userId, String name) {
        return createPlaylistIn(repository, userId, name);
    }

    /** Shared playlist-creation logic for both the live and sim paths. */
    private Playlist createPlaylistIn(MusicStreamingRepository repo, String userId, String name) {
        User user = repo.findUserById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));
        if (name == null || name.isBlank()) {
            throw new InvalidPlaylistOperationException("Playlist name cannot be blank");
        }

        Playlist playlist = Playlist.builder()
                .id(repo.generatePlaylistId())
                .name(name)
                .ownerId(userId)
                .songIds(new ArrayList<>())
                .isPublic(false)
                .build();
        repo.savePlaylist(playlist);

        user.getPlaylistIds().add(playlist.getId());
        repo.saveUser(user);
        return playlist;
    }

    public Playlist addSongToPlaylist(String playlistId, String songId) {
        return addSongToPlaylistIn(repository, playlistId, songId);
    }

    private Playlist addSongToPlaylistIn(MusicStreamingRepository repo, String playlistId, String songId) {
        Playlist playlist = repo.findPlaylistById(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException("Playlist not found: " + playlistId));
        repo.findSongById(songId)
                .orElseThrow(() -> new SongNotFoundException("Song not found: " + songId));

        if (!playlist.getSongIds().contains(songId)) {
            playlist.getSongIds().add(songId);
        }
        return repo.savePlaylist(playlist);
    }

    public Playlist removeSongFromPlaylist(String playlistId, String songId) {
        return removeSongFromPlaylistIn(repository, playlistId, songId);
    }

    private Playlist removeSongFromPlaylistIn(MusicStreamingRepository repo, String playlistId, String songId) {
        Playlist playlist = repo.findPlaylistById(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException("Playlist not found: " + playlistId));
        if (!playlist.getSongIds().remove(songId)) {
            throw new InvalidPlaylistOperationException("Song " + songId + " is not in playlist " + playlistId);
        }
        return repo.savePlaylist(playlist);
    }

    public Playlist reorderPlaylist(String playlistId, String songId, int newPosition) {
        return reorderPlaylistIn(repository, playlistId, songId, newPosition);
    }

    private Playlist reorderPlaylistIn(MusicStreamingRepository repo, String playlistId, String songId, int newPosition) {
        Playlist playlist = repo.findPlaylistById(playlistId)
                .orElseThrow(() -> new PlaylistNotFoundException("Playlist not found: " + playlistId));
        List<String> songIds = playlist.getSongIds();
        if (!songIds.remove(songId)) {
            throw new InvalidPlaylistOperationException("Song " + songId + " is not in playlist " + playlistId);
        }
        int clamped = Math.max(0, Math.min(newPosition, songIds.size()));
        songIds.add(clamped, songId);
        return repo.savePlaylist(playlist);
    }

    // ==========================================
    // Liked Songs
    // ==========================================

    public User likeSong(String userId, String songId) {
        return likeSongIn(repository, userId, songId);
    }

    private User likeSongIn(MusicStreamingRepository repo, String userId, String songId) {
        User user = repo.findUserById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));
        repo.findSongById(songId)
                .orElseThrow(() -> new SongNotFoundException("Song not found: " + songId));
        if (!user.getLikedSongIds().contains(songId)) {
            user.getLikedSongIds().add(songId);
        }
        return repo.saveUser(user);
    }

    public User unlikeSong(String userId, String songId) {
        User user = repository.findUserById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));
        user.getLikedSongIds().remove(songId);
        return repository.saveUser(user);
    }

    // ==========================================
    // Playback (delegates the concurrency-critical work to PlaybackService)
    // ==========================================

    public PlaybackSession startPlayback(String userId, String songId, String deviceId) {
        PlaybackSession session = playbackService.startStream(repository, strategyFactory, userId, songId, deviceId);
        return session;
    }

    public PlaybackSession stopPlayback(String sessionId) {
        return playbackService.stopStream(repository, sessionId);
    }

    public PlaybackSession skipPlayback(String sessionId) {
        return playbackService.skip(repository, strategyFactory, sessionId);
    }

    public List<PlaybackSession> getActiveSessionsForUser(String userId) {
        repository.findUserById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));
        return repository.findActiveSessionsForUser(userId);
    }

    // ==========================================
    // Downloads
    // ==========================================

    public User downloadSong(String userId, String songId) {
        return downloadSongIn(repository, userId, songId);
    }

    private User downloadSongIn(MusicStreamingRepository repo, String userId, String songId) {
        User user = repo.findUserById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));
        repo.findSongById(songId)
                .orElseThrow(() -> new SongNotFoundException("Song not found: " + songId));

        SubscriptionStrategy strategy = strategyFactory.getStrategy(user.getSubscription().getPlan());
        if (!strategy.canDownloadOffline()) {
            throw new DownloadNotAllowedException(
                    "Plan " + strategy.getPlan() + " does not permit offline downloads");
        }
        if (!user.getDownloadedSongIds().contains(songId)) {
            user.getDownloadedSongIds().add(songId);
        }
        return repo.saveUser(user);
    }

    // ==========================================
    // Recommendations
    // ==========================================

    public List<Song> getRecommendations(String userId, int limit) {
        User user = repository.findUserById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));
        return recommendationService.recommendFor(repository, user, limit);
    }

    // ==========================================
    // Simulation Sandbox Methods (/sim/*)
    // ==========================================

    public void simReset() {
        simRepository.seed();
        simEventLog.clear();
        simEventSeq.set(0);
        addSimEvent("RESET", "System", "Simulation sandbox re-seeded to initial state", Map.of());
    }

    public Map<String, Object> simState() {
        return Map.of(
                "songs", simRepository.findAllSongs(),
                "playlists", simRepository.findAllPlaylists(),
                "users", simRepository.findAllUsers(),
                "sessions", simRepository.findAllSessions()
        );
    }

    public PlaybackSession simPlay(String userId, String songId, String deviceId) {
        PlaybackSession session = playbackService.startStream(simRepository, strategyFactory, userId, songId, deviceId);
        Song song = simRepository.findSongById(songId).orElseThrow();
        addSimEvent("PLAY", userId, "Started streaming \"" + song.getTitle() + "\" on " + session.getDeviceId(),
                Map.of("sessionId", session.getId(), "userId", userId, "songId", songId,
                        "adInjected", session.isAdInjected()));
        return session;
    }

    public PlaybackSession simStop(String sessionId) {
        PlaybackSession session = playbackService.stopStream(simRepository, sessionId);
        addSimEvent("STOP", session.getUserId(), "Stopped session " + sessionId,
                Map.of("sessionId", sessionId, "userId", session.getUserId()));
        return session;
    }

    public PlaybackSession simSkip(String sessionId) {
        PlaybackSession session = playbackService.skip(simRepository, strategyFactory, sessionId);
        addSimEvent("SKIP", session.getUserId(), "Skipped track in session " + sessionId,
                Map.of("sessionId", sessionId, "userId", session.getUserId()));
        return session;
    }

    public User simLike(String userId, String songId) {
        User user = likeSongIn(simRepository, userId, songId);
        addSimEvent("LIKE", userId, "Liked song " + songId, Map.of("userId", userId, "songId", songId));
        return user;
    }

    public User simDownload(String userId, String songId) {
        User user = downloadSongIn(simRepository, userId, songId);
        addSimEvent("DOWNLOAD", userId, "Downloaded song " + songId + " for offline playback",
                Map.of("userId", userId, "songId", songId));
        return user;
    }

    public User simChangeSubscription(String userId, SubscriptionPlan plan) {
        User user = changeSubscriptionIn(simRepository, userId, plan);
        addSimEvent("PLAN_CHANGE", userId, "Switched to " + plan + " plan",
                Map.of("userId", userId, "plan", plan.name()));
        return user;
    }

    public List<MusicStreamingEvent> simEvents() {
        return new ArrayList<>(simEventLog);
    }

    /**
     * Runs {@code attempts} threads that all try to start a stream on the same account at
     * the same instant, when the plan allows only a handful of concurrent devices. The
     * per-user lock in {@link PlaybackService#startStream} means exactly
     * {@code min(attempts, maxConcurrentStreams)} can win — this endpoint exists so the
     * Simulation tab can show that happening live, rather than asserting it in prose.
     *
     * <p>A CountDownLatch releases every thread together so they genuinely contend
     * instead of running one after another.
     */
    public Map<String, Object> simRace(String userId, String songId, int attempts) {
        int n = Math.max(2, Math.min(attempts, 20));

        // Clear out any sessions left over from a previous race so the cap is measured
        // fresh, the same way simRestaurant's race releases the table first.
        for (PlaybackSession s : simRepository.findActiveSessionsForUser(userId)) {
            playbackService.stopStream(simRepository, s.getId());
        }

        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(n);
        List<Map<String, Object>> results = new CopyOnWriteArrayList<>();

        try {
            for (int i = 1; i <= n; i++) {
                final String device = "device-" + i;
                pool.submit(() -> {
                    try {
                        start.await();
                        PlaybackSession session = playbackService.startStream(simRepository, strategyFactory, userId, songId, device);
                        results.add(Map.of("device", device, "outcome", "WON",
                                "reason", "started streaming on " + device, "sessionId", session.getId()));
                    } catch (com.lld.musicstreaming.exception.ConcurrentStreamLimitExceededException rejected) {
                        results.add(Map.of("device", device, "outcome", "REJECTED", "reason", rejected.getMessage()));
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
            }

            start.countDown();
            if (!done.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Race did not settle within 5 seconds");
            }
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Race was interrupted");
        } finally {
            pool.shutdown();
        }

        results.sort(Comparator.comparing(r -> String.valueOf(r.get("device"))));
        long won = results.stream().filter(r -> "WON".equals(r.get("outcome"))).count();
        long rejected = results.stream().filter(r -> "REJECTED".equals(r.get("outcome"))).count();

        User user = simRepository.findUserById(userId).orElseThrow();
        SubscriptionStrategy strategy = strategyFactory.getStrategy(user.getSubscription().getPlan());

        addSimEvent("RACE", userId,
                n + " devices raced to stream on " + userId + "'s account (" + strategy.getPlan()
                        + ", limit " + strategy.maxConcurrentStreams() + ") — " + won + " won, " + rejected + " rejected",
                Map.of("userId", userId, "attempts", n, "plan", strategy.getPlan().name(),
                        "limit", strategy.maxConcurrentStreams(), "won", won, "rejected", rejected));

        return Map.of(
                "userId", userId,
                "attempts", n,
                "plan", strategy.getPlan().name(),
                "limit", strategy.maxConcurrentStreams(),
                "won", won,
                "rejected", rejected,
                "results", results
        );
    }

    private void addSimEvent(String type, String actor, String message, Map<String, Object> detail) {
        long id = simEventSeq.incrementAndGet();
        simEventLog.add(new MusicStreamingEvent(id, type, actor, message, detail, java.time.Instant.now()));
    }
}
