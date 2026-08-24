package com.lld.musicstreaming.controller;

import com.lld.musicstreaming.model.Album;
import com.lld.musicstreaming.model.Artist;
import com.lld.musicstreaming.model.MusicStreamingEvent;
import com.lld.musicstreaming.model.PlaybackSession;
import com.lld.musicstreaming.model.Playlist;
import com.lld.musicstreaming.model.Song;
import com.lld.musicstreaming.model.SubscriptionPlan;
import com.lld.musicstreaming.model.User;
import com.lld.musicstreaming.service.MusicStreamingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/music-streaming")
@CrossOrigin(origins = "*")
@Tag(name = "Music Streaming API", description = "Catalog, playlists, subscription-tier playback rules, and simulation sandbox")
public class MusicStreamingController {

    private final MusicStreamingService musicStreamingService;

    public MusicStreamingController(MusicStreamingService musicStreamingService) {
        this.musicStreamingService = musicStreamingService;
    }

    // ---- Catalog ----

    @GetMapping("/songs")
    @Operation(summary = "List all songs in the catalog")
    public ResponseEntity<List<Song>> getSongs() {
        return ResponseEntity.ok(musicStreamingService.getSongs());
    }

    @GetMapping("/songs/{songId}")
    @Operation(summary = "Get a song by id")
    public ResponseEntity<Song> getSong(@PathVariable String songId) {
        return ResponseEntity.ok(musicStreamingService.getSong(songId));
    }

    @GetMapping("/artists")
    @Operation(summary = "List all artists")
    public ResponseEntity<List<Artist>> getArtists() {
        return ResponseEntity.ok(musicStreamingService.getArtists());
    }

    @GetMapping("/albums")
    @Operation(summary = "List all albums")
    public ResponseEntity<List<Album>> getAlbums() {
        return ResponseEntity.ok(musicStreamingService.getAlbums());
    }

    @GetMapping("/search")
    @Operation(summary = "Search songs, artists, albums and public playlists")
    public ResponseEntity<Map<String, Object>> search(@RequestParam(required = false) String query) {
        return ResponseEntity.ok(musicStreamingService.search(query));
    }

    // ---- Users ----

    @GetMapping("/users")
    @Operation(summary = "List all users")
    public ResponseEntity<List<User>> getUsers() {
        return ResponseEntity.ok(musicStreamingService.getUsers());
    }

    @GetMapping("/users/{userId}")
    @Operation(summary = "Get a user by id")
    public ResponseEntity<User> getUser(@PathVariable String userId) {
        return ResponseEntity.ok(musicStreamingService.getUser(userId));
    }

    @PostMapping("/users/{userId}/subscription")
    @Operation(summary = "Change a user's subscription plan")
    public ResponseEntity<User> changeSubscription(@PathVariable String userId, @RequestBody Map<String, String> body) {
        SubscriptionPlan plan = SubscriptionPlan.valueOf(body.get("plan"));
        return ResponseEntity.ok(musicStreamingService.changeSubscription(userId, plan));
    }

    @GetMapping("/users/{userId}/recommendations")
    @Operation(summary = "Genre-affinity song recommendations for a user")
    public ResponseEntity<List<Song>> getRecommendations(@PathVariable String userId,
                                                           @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(musicStreamingService.getRecommendations(userId, limit));
    }

    @PostMapping("/users/{userId}/like/{songId}")
    @Operation(summary = "Like a song")
    public ResponseEntity<User> likeSong(@PathVariable String userId, @PathVariable String songId) {
        return ResponseEntity.ok(musicStreamingService.likeSong(userId, songId));
    }

    @DeleteMapping("/users/{userId}/like/{songId}")
    @Operation(summary = "Unlike a song")
    public ResponseEntity<User> unlikeSong(@PathVariable String userId, @PathVariable String songId) {
        return ResponseEntity.ok(musicStreamingService.unlikeSong(userId, songId));
    }

    @PostMapping("/users/{userId}/download/{songId}")
    @Operation(summary = "Download a song for offline playback (blocked on FREE plan)")
    public ResponseEntity<User> downloadSong(@PathVariable String userId, @PathVariable String songId) {
        return ResponseEntity.ok(musicStreamingService.downloadSong(userId, songId));
    }

    // ---- Playlists ----

    @GetMapping("/users/{userId}/playlists")
    @Operation(summary = "List a user's playlists")
    public ResponseEntity<List<Playlist>> getPlaylistsForUser(@PathVariable String userId) {
        return ResponseEntity.ok(musicStreamingService.getPlaylistsForUser(userId));
    }

    @GetMapping("/playlists/{playlistId}")
    @Operation(summary = "Get a playlist by id")
    public ResponseEntity<Playlist> getPlaylist(@PathVariable String playlistId) {
        return ResponseEntity.ok(musicStreamingService.getPlaylist(playlistId));
    }

    @PostMapping("/users/{userId}/playlists")
    @Operation(summary = "Create a new empty playlist")
    public ResponseEntity<Playlist> createPlaylist(@PathVariable String userId, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(musicStreamingService.createPlaylist(userId, body.get("name")));
    }

    @PostMapping("/playlists/{playlistId}/songs")
    @Operation(summary = "Add a song to a playlist")
    public ResponseEntity<Playlist> addSongToPlaylist(@PathVariable String playlistId, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(musicStreamingService.addSongToPlaylist(playlistId, body.get("songId")));
    }

    @DeleteMapping("/playlists/{playlistId}/songs/{songId}")
    @Operation(summary = "Remove a song from a playlist")
    public ResponseEntity<Playlist> removeSongFromPlaylist(@PathVariable String playlistId, @PathVariable String songId) {
        return ResponseEntity.ok(musicStreamingService.removeSongFromPlaylist(playlistId, songId));
    }

    @PostMapping("/playlists/{playlistId}/reorder")
    @Operation(summary = "Move a song to a new position in a playlist")
    public ResponseEntity<Playlist> reorderPlaylist(@PathVariable String playlistId, @RequestBody Map<String, Object> body) {
        String songId = (String) body.get("songId");
        int newPosition = ((Number) body.get("newPosition")).intValue();
        return ResponseEntity.ok(musicStreamingService.reorderPlaylist(playlistId, songId, newPosition));
    }

    // ---- Playback ----

    @PostMapping("/playback/start")
    @Operation(summary = "Start a playback session — enforces the plan's concurrent-stream limit")
    public ResponseEntity<PlaybackSession> startPlayback(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(musicStreamingService.startPlayback(body.get("userId"), body.get("songId"), body.get("deviceId")));
    }

    @PostMapping("/playback/{sessionId}/stop")
    @Operation(summary = "Stop a playback session")
    public ResponseEntity<PlaybackSession> stopPlayback(@PathVariable String sessionId) {
        return ResponseEntity.ok(musicStreamingService.stopPlayback(sessionId));
    }

    @PostMapping("/playback/{sessionId}/skip")
    @Operation(summary = "Skip the current track — enforces the plan's hourly skip limit")
    public ResponseEntity<PlaybackSession> skipPlayback(@PathVariable String sessionId) {
        return ResponseEntity.ok(musicStreamingService.skipPlayback(sessionId));
    }

    @GetMapping("/users/{userId}/sessions")
    @Operation(summary = "List a user's active playback sessions")
    public ResponseEntity<List<PlaybackSession>> getActiveSessions(@PathVariable String userId) {
        return ResponseEntity.ok(musicStreamingService.getActiveSessionsForUser(userId));
    }

    // ---- Simulation Sandbox Endpoints (/sim/*) ----

    @PostMapping("/sim/reset")
    @Operation(summary = "Reset simulation sandbox state")
    public ResponseEntity<Map<String, String>> simReset() {
        musicStreamingService.simReset();
        return ResponseEntity.ok(Map.of("status", "reset"));
    }

    @GetMapping("/sim/state")
    @Operation(summary = "Get current simulation state snapshot")
    public ResponseEntity<Map<String, Object>> simState() {
        return ResponseEntity.ok(musicStreamingService.simState());
    }

    @PostMapping("/sim/play")
    @Operation(summary = "Start a sandbox playback session")
    public ResponseEntity<PlaybackSession> simPlay(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(musicStreamingService.simPlay(body.get("userId"), body.get("songId"), body.get("deviceId")));
    }

    @PostMapping("/sim/stop")
    @Operation(summary = "Stop a sandbox playback session")
    public ResponseEntity<PlaybackSession> simStop(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(musicStreamingService.simStop(body.get("sessionId")));
    }

    @PostMapping("/sim/skip")
    @Operation(summary = "Skip the track in a sandbox session")
    public ResponseEntity<PlaybackSession> simSkip(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(musicStreamingService.simSkip(body.get("sessionId")));
    }

    @PostMapping("/sim/like")
    @Operation(summary = "Like a song in the sandbox")
    public ResponseEntity<User> simLike(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(musicStreamingService.simLike(body.get("userId"), body.get("songId")));
    }

    @PostMapping("/sim/download")
    @Operation(summary = "Download a song in the sandbox (blocked on FREE plan)")
    public ResponseEntity<User> simDownload(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(musicStreamingService.simDownload(body.get("userId"), body.get("songId")));
    }

    @PostMapping("/sim/subscription")
    @Operation(summary = "Change a sandbox user's subscription plan")
    public ResponseEntity<User> simChangeSubscription(@RequestBody Map<String, String> body) {
        SubscriptionPlan plan = SubscriptionPlan.valueOf(body.get("plan"));
        return ResponseEntity.ok(musicStreamingService.simChangeSubscription(body.get("userId"), plan));
    }

    @PostMapping("/sim/race")
    @Operation(summary = "Race N devices to start streaming on one account at once — exactly the plan's limit wins")
    public ResponseEntity<Map<String, Object>> simRace(@RequestBody Map<String, Object> body) {
        String userId = (String) body.get("userId");
        String songId = (String) body.get("songId");
        int attempts = ((Number) body.getOrDefault("attempts", 5)).intValue();
        return ResponseEntity.ok(musicStreamingService.simRace(userId, songId, attempts));
    }

    @GetMapping("/sim/events")
    @Operation(summary = "Get the sandbox event log")
    public ResponseEntity<List<MusicStreamingEvent>> simEvents() {
        return ResponseEntity.ok(musicStreamingService.simEvents());
    }
}
